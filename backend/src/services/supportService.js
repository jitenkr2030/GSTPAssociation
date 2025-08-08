const SupportTicket = require('../models/SupportTicket');
const LiveChat = require('../models/LiveChat');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// Support Ticket Management
const createTicket = async (req, res) => {
  try {
    const { subject, description, category, subcategory, priority, attachments } = req.body;
    const userId = req.user.id;
    
    // Get user information for customer context
    const user = await User.findById(userId);
    
    // Determine priority based on user membership and category
    const determinedPriority = determinePriority(priority, user.membership?.type, category);
    
    // Auto-assign department based on category
    const department = assignDepartment(category);
    
    // Create ticket
    const ticket = new SupportTicket({
      user: userId,
      subject,
      description,
      category,
      subcategory,
      priority: determinedPriority,
      department,
      attachments: attachments || [],
      customerInfo: {
        membershipType: user.membership?.type || 'free',
        accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24)),
        previousTickets: await SupportTicket.countDocuments({ user: userId }),
        lastActivity: user.lastLoginAt,
        preferredLanguage: user.profile?.language || 'English',
        timezone: user.profile?.timezone || 'Asia/Kolkata'
      },
      sla: {
        responseTime: {
          target: getSLAResponseTime(determinedPriority, user.membership?.type),
          met: false
        },
        resolutionTime: {
          target: getSLAResolutionTime(determinedPriority, user.membership?.type),
          met: false
        }
      }
    });
    
    // Add initial message
    ticket.messages.push({
      sender: userId,
      senderType: 'customer',
      message: description,
      attachments: attachments || []
    });
    
    await ticket.save();
    
    // Auto-assign if possible
    await autoAssignTicket(ticket);
    
    // Send confirmation email
    await sendTicketConfirmationEmail(user, ticket);
    
    // Send SMS for high priority tickets
    if (determinedPriority === 'High' || determinedPriority === 'Critical') {
      await sendTicketSMS(user, ticket);
    }
    
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket'
    });
  }
};

const getTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, category, limit = 10, skip = 0, sort = 'createdAt' } = req.query;
    
    let query = { user: userId, isDeleted: false };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    
    const tickets = await SupportTicket.find(query)
      .populate('assignedTo', 'name profile.avatar')
      .sort({ [sort]: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-messages.readBy -automation');
    
    const total = await SupportTicket.countDocuments(query);
    
    res.json({
      success: true,
      tickets,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets'
    });
  }
};

const getTicket = async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const userId = req.user.id;
    
    const ticket = await SupportTicket.findOne({ 
      ticketNumber, 
      user: userId, 
      isDeleted: false 
    })
    .populate('user', 'name email profile.avatar')
    .populate('assignedTo', 'name profile.avatar')
    .populate('messages.sender', 'name profile.avatar');
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Mark messages as read by customer
    ticket.messages.forEach(msg => {
      if (msg.senderType !== 'customer') {
        const readEntry = msg.readBy.find(read => read.user.toString() === userId.toString());
        if (!readEntry) {
          msg.readBy.push({ user: userId });
        }
      }
    });
    
    await ticket.save();
    
    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket'
    });
  }
};

const addTicketMessage = async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { message, attachments } = req.body;
    const userId = req.user.id;
    
    const ticket = await SupportTicket.findOne({ 
      ticketNumber, 
      user: userId, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    if (ticket.status === 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add message to closed ticket'
      });
    }
    
    await ticket.addMessage(userId, 'customer', message, { attachments });
    
    // Update ticket status if it was resolved
    if (ticket.status === 'Resolved') {
      ticket.status = 'Open';
      await ticket.save();
    }
    
    // Notify assigned agent
    if (ticket.assignedTo) {
      await notifyAgent(ticket.assignedTo, ticket, 'new_message');
    }
    
    res.json({
      success: true,
      message: 'Message added successfully'
    });
  } catch (error) {
    console.error('Add ticket message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding message to ticket'
    });
  }
};

const submitTicketFeedback = async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;
    
    const ticket = await SupportTicket.findOne({ 
      ticketNumber, 
      user: userId, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Can only provide feedback for resolved or closed tickets'
      });
    }
    
    await ticket.addFeedback(rating, comment);
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
};

// Live Chat Management
const startLiveChat = async (req, res) => {
  try {
    const { department = 'General Support', preChatData, priority } = req.body;
    const userId = req.user.id;
    
    // Check if user already has an active chat
    const existingChat = await LiveChat.findOne({
      customer: userId,
      status: { $in: ['waiting', 'active'] }
    });
    
    if (existingChat) {
      return res.json({
        success: true,
        chat: existingChat,
        message: 'Existing chat session found'
      });
    }
    
    const user = await User.findById(userId);
    
    // Determine priority based on membership
    const chatPriority = determineChatPriority(priority, user.membership?.type);
    
    // Create new chat session
    const chat = new LiveChat({
      customer: userId,
      department,
      priority: chatPriority,
      preChatData,
      customerInfo: {
        name: user.name,
        email: user.email,
        phone: user.profile?.phone,
        membershipType: user.membership?.type || 'free',
        previousChats: await LiveChat.countDocuments({ customer: userId }),
        currentPage: req.headers.referer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });
    
    await chat.save();
    
    // Update queue positions
    await LiveChat.updateQueuePositions(department);
    
    // Try to auto-assign if agents are available
    await autoAssignChat(chat);
    
    res.status(201).json({
      success: true,
      chat: {
        sessionId: chat.sessionId,
        status: chat.status,
        queuePosition: chat.queuePosition,
        estimatedWaitTime: await getEstimatedWaitTime(department)
      },
      message: 'Chat session started'
    });
  } catch (error) {
    console.error('Start live chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting live chat'
    });
  }
};

const sendChatMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, messageType = 'text', attachments } = req.body;
    const userId = req.user.id;
    
    const chat = await LiveChat.findOne({ 
      sessionId, 
      customer: userId,
      status: { $in: ['waiting', 'active'] }
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found or ended'
      });
    }
    
    await chat.addMessage(userId, 'customer', message, { messageType, attachments });
    
    // Notify agent if chat is active
    if (chat.status === 'active' && chat.agent) {
      await notifyAgent(chat.agent, chat, 'new_chat_message');
    }
    
    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

const endLiveChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason = 'customer_ended' } = req.body;
    const userId = req.user.id;
    
    const chat = await LiveChat.findOne({ 
      sessionId, 
      customer: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    await chat.endSession(userId, reason);
    
    res.json({
      success: true,
      message: 'Chat session ended',
      feedbackUrl: `/chat/${sessionId}/feedback`
    });
  } catch (error) {
    console.error('End live chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending chat session'
    });
  }
};

const submitChatFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, comment, categories, npsScore } = req.body;
    const userId = req.user.id;
    
    const chat = await LiveChat.findOne({ 
      sessionId, 
      customer: userId 
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    await chat.addFeedback(rating, comment, categories, npsScore);
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit chat feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
};

// Utility Functions
const determinePriority = (requestedPriority, membershipType, category) => {
  // Premium members get higher priority
  if (membershipType === 'elite') {
    return requestedPriority === 'Low' ? 'Medium' : requestedPriority;
  }
  if (membershipType === 'premium') {
    return requestedPriority === 'Low' ? 'Medium' : requestedPriority;
  }
  
  // Critical categories get higher priority
  const criticalCategories = ['Payment Issues', 'Account Management', 'Bug Report'];
  if (criticalCategories.includes(category)) {
    return requestedPriority === 'Low' ? 'Medium' : requestedPriority;
  }
  
  return requestedPriority || 'Medium';
};

const assignDepartment = (category) => {
  const departmentMap = {
    'Technical Support': 'Technical',
    'GST Queries': 'GST Expert',
    'Payment Issues': 'Billing',
    'Billing Support': 'Billing',
    'Compliance Help': 'GST Expert',
    'Training Support': 'GST Expert'
  };
  
  return departmentMap[category] || 'General Support';
};

const getSLAResponseTime = (priority, membershipType) => {
  const baseTimes = {
    'Critical': 15,
    'Urgent': 30,
    'High': 60,
    'Medium': 240,
    'Low': 480
  };
  
  let responseTime = baseTimes[priority] || 240;
  
  // Premium members get faster response
  if (membershipType === 'elite') responseTime = Math.floor(responseTime * 0.5);
  else if (membershipType === 'premium') responseTime = Math.floor(responseTime * 0.7);
  
  return responseTime;
};

const getSLAResolutionTime = (priority, membershipType) => {
  const baseTimes = {
    'Critical': 240,
    'Urgent': 480,
    'High': 1440,
    'Medium': 2880,
    'Low': 5760
  };
  
  let resolutionTime = baseTimes[priority] || 2880;
  
  // Premium members get faster resolution
  if (membershipType === 'elite') resolutionTime = Math.floor(resolutionTime * 0.6);
  else if (membershipType === 'premium') resolutionTime = Math.floor(resolutionTime * 0.8);
  
  return resolutionTime;
};

const autoAssignTicket = async (ticket) => {
  // Find available agents in the department
  const availableAgents = await User.find({
    role: { $in: ['agent', 'admin'] },
    'profile.department': ticket.department,
    isActive: true,
    'profile.isAvailable': true
  }).limit(5);
  
  if (availableAgents.length > 0) {
    // Simple round-robin assignment (could be enhanced with workload balancing)
    const assignedAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
    await ticket.assignTo(assignedAgent._id, ticket.department);
    
    // Notify agent
    await notifyAgent(assignedAgent._id, ticket, 'ticket_assigned');
  }
};

const autoAssignChat = async (chat) => {
  // Find available agents for live chat
  const availableAgents = await User.find({
    role: { $in: ['agent', 'admin'] },
    'profile.department': chat.department,
    isActive: true,
    'profile.isAvailable': true,
    'profile.acceptingChats': true
  }).limit(3);
  
  if (availableAgents.length > 0) {
    const assignedAgent = availableAgents[0]; // First available agent
    await chat.assignAgent(assignedAgent._id);
    
    // Notify agent
    await notifyAgent(assignedAgent._id, chat, 'chat_assigned');
  }
};

const getEstimatedWaitTime = async (department) => {
  const queueStats = await LiveChat.getQueueStats(department);
  const avgWaitTime = queueStats[0]?.avgWaitTime || 300; // Default 5 minutes
  const queueLength = queueStats[0]?.totalWaiting || 0;
  
  return Math.max(avgWaitTime, queueLength * 120); // 2 minutes per person in queue
};

const determineChatPriority = (requestedPriority, membershipType) => {
  if (membershipType === 'elite') return 'VIP';
  if (membershipType === 'premium') return 'High';
  return requestedPriority || 'Medium';
};

const sendTicketConfirmationEmail = async (user, ticket) => {
  const subject = `Support Ticket Created - ${ticket.ticketNumber}`;
  const content = `
    <h2>Support Ticket Confirmation</h2>
    <p>Dear ${user.name},</p>
    <p>Your support ticket has been created successfully.</p>
    <h3>Ticket Details:</h3>
    <ul>
      <li><strong>Ticket Number:</strong> ${ticket.ticketNumber}</li>
      <li><strong>Subject:</strong> ${ticket.subject}</li>
      <li><strong>Priority:</strong> ${ticket.priority}</li>
      <li><strong>Status:</strong> ${ticket.status}</li>
    </ul>
    <p>We will respond to your ticket within ${ticket.sla.responseTime.target} minutes.</p>
    <p><a href="${process.env.FRONTEND_URL}/support/tickets/${ticket.ticketNumber}">View Ticket</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendTicketSMS = async (user, ticket) => {
  if (user.profile?.phone) {
    const message = `GSTPAssociation: High priority support ticket ${ticket.ticketNumber} created. We'll respond within ${ticket.sla.responseTime.target} minutes.`;
    await sendSMS(user.profile.phone, message);
  }
};

const notifyAgent = async (agentId, ticketOrChat, notificationType) => {
  // Implementation would send real-time notifications to agents
  // This could use WebSocket, push notifications, email, etc.
  console.log(`Notifying agent ${agentId} about ${notificationType}`);
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  addTicketMessage,
  submitTicketFeedback,
  startLiveChat,
  sendChatMessage,
  endLiveChat,
  submitChatFeedback
};
