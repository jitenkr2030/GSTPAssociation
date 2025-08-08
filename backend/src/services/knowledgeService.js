const Article = require('../models/Article');
const Course = require('../models/Course');
const Webinar = require('../models/Webinar');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailUtils');

// Article Management
const getArticles = async (req, res) => {
  try {
    const { 
      category, 
      tags, 
      difficulty, 
      search, 
      limit = 12, 
      skip = 0, 
      sort = 'publishedAt' 
    } = req.query;
    
    let articles;
    let total;
    
    if (search) {
      articles = await Article.searchArticles(search, {
        category,
        difficulty,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      total = await Article.countDocuments({
        status: 'published',
        $text: { $search: search },
        ...(category && { category }),
        ...(difficulty && { difficulty })
      });
    } else {
      const tagArray = tags ? tags.split(',') : undefined;
      
      articles = await Article.findPublished({
        category,
        tags: tagArray,
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort: { [sort]: -1 }
      });
      
      total = await Article.countDocuments({
        status: 'published',
        ...(category && { category }),
        ...(tagArray && { tags: { $in: tagArray } })
      });
    }
    
    res.json({
      success: true,
      articles,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles'
    });
  }
};

const getArticle = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const article = await Article.findOne({ slug, status: 'published' })
      .populate('author', 'name profile.avatar profile.bio')
      .populate('relatedArticles', 'title slug excerpt featuredImage category readingTime');
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Check access permissions
    const userId = req.user?.id;
    if (article.isPremium && (!userId || !await checkMembershipAccess(userId, article.requiredMembership))) {
      return res.status(403).json({
        success: false,
        message: 'Premium membership required to access this article'
      });
    }
    
    // Increment views
    await article.incrementViews();
    
    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article'
    });
  }
};

const likeArticle = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    
    const article = await Article.findOne({ slug, status: 'published' });
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    await article.addLike(userId);
    
    res.json({
      success: true,
      message: 'Article liked successfully',
      likeCount: article.likeCount
    });
  } catch (error) {
    console.error('Like article error:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking article'
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    const article = await Article.findOne({ slug, status: 'published' });
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    await article.addComment(userId, content);
    
    res.json({
      success: true,
      message: 'Comment added successfully. It will be visible after moderation.'
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// Course Management
const getCourses = async (req, res) => {
  try {
    const { 
      category, 
      level, 
      pricing, 
      search, 
      limit = 12, 
      skip = 0, 
      sort = 'publishedAt' 
    } = req.query;
    
    let courses;
    let total;
    
    if (search) {
      courses = await Course.searchCourses(search, {
        category,
        level,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      total = await Course.countDocuments({
        status: 'published',
        $text: { $search: search },
        ...(category && { category }),
        ...(level && { level })
      });
    } else {
      courses = await Course.findPublished({
        category,
        level,
        pricing,
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort: { [sort]: -1 }
      });
      
      total = await Course.countDocuments({
        status: 'published',
        ...(category && { category }),
        ...(level && { level }),
        ...(pricing && { 'pricing.type': pricing })
      });
    }
    
    res.json({
      success: true,
      courses,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses'
    });
  }
};

const getCourse = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    const course = await Course.findOne({ slug, status: 'published' })
      .populate('instructor', 'name profile.avatar profile.bio')
      .populate('coInstructors', 'name profile.avatar');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if user is enrolled
    let userEnrollment = null;
    if (userId) {
      userEnrollment = course.enrollments.find(
        enrollment => enrollment.user.toString() === userId.toString()
      );
    }
    
    // Filter course content based on enrollment and preview settings
    const filteredCourse = {
      ...course.toObject(),
      modules: course.modules.map(module => ({
        ...module,
        lessons: module.lessons.map(lesson => {
          if (lesson.isPreview || userEnrollment) {
            return lesson;
          } else {
            // Return limited info for non-enrolled users
            return {
              title: lesson.title,
              description: lesson.description,
              type: lesson.type,
              order: lesson.order,
              isPreview: lesson.isPreview
            };
          }
        })
      }))
    };
    
    res.json({
      success: true,
      course: filteredCourse,
      userEnrollment: userEnrollment ? {
        enrolledAt: userEnrollment.enrolledAt,
        progress: userEnrollment.progress,
        certificateIssued: userEnrollment.certificateIssued
      } : null
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course'
    });
  }
};

const enrollCourse = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    
    const course = await Course.findOne({ slug, status: 'published' });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Check if course is free or user has required membership
    if (course.pricing.type === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This is a paid course. Please complete payment first.'
      });
    }
    
    if (course.pricing.type === 'premium_only') {
      const user = await User.findById(userId);
      if (!user.isMembershipActive() || !['premium', 'elite'].includes(user.membership.type)) {
        return res.status(403).json({
          success: false,
          message: 'Premium membership required for this course'
        });
      }
    }
    
    await course.enrollUser(userId);
    
    // Send enrollment confirmation email
    const user = await User.findById(userId);
    await sendCourseEnrollmentEmail(user, course);
    
    res.json({
      success: true,
      message: 'Successfully enrolled in the course'
    });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error enrolling in course'
    });
  }
};

const updateCourseProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { moduleIndex, lessonIndex, timeSpent, score } = req.body;
    const userId = req.user.id;
    
    const course = await Course.findOne({ slug, status: 'published' });
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    await course.updateProgress(userId, moduleIndex, lessonIndex, { timeSpent, score });
    
    // Get updated enrollment info
    const updatedCourse = await Course.findById(course._id);
    const enrollment = updatedCourse.enrollments.find(
      enrollment => enrollment.user.toString() === userId.toString()
    );
    
    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: enrollment.progress,
      certificateIssued: enrollment.certificateIssued
    });
  } catch (error) {
    console.error('Update course progress error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating progress'
    });
  }
};

// Webinar Management
const getWebinars = async (req, res) => {
  try {
    const { 
      category, 
      level, 
      type = 'upcoming', 
      limit = 12, 
      skip = 0 
    } = req.query;
    
    let webinars;
    let total;
    
    if (type === 'upcoming') {
      webinars = await Webinar.findUpcoming({
        category,
        level,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      total = await Webinar.countDocuments({
        status: 'scheduled',
        scheduledAt: { $gt: new Date() },
        ...(category && { category }),
        ...(level && { level })
      });
    } else if (type === 'recorded') {
      webinars = await Webinar.findRecorded({
        category,
        limit: parseInt(limit),
        skip: parseInt(skip)
      });
      
      total = await Webinar.countDocuments({
        status: 'completed',
        'recording.recordingUrl': { $exists: true, $ne: null },
        ...(category && { category })
      });
    }
    
    res.json({
      success: true,
      webinars,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get webinars error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webinars'
    });
  }
};

const getWebinar = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    const webinar = await Webinar.findOne({ slug })
      .populate('host', 'name profile.avatar profile.bio')
      .populate('coHosts', 'name profile.avatar')
      .populate('speakers.user', 'name profile.avatar profile.bio');
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    // Check if user is registered
    let userRegistration = null;
    if (userId) {
      userRegistration = webinar.registrations.find(
        reg => reg.user.toString() === userId.toString()
      );
    }
    
    // Filter sensitive information based on registration status
    const filteredWebinar = {
      ...webinar.toObject(),
      meetingDetails: userRegistration ? webinar.meetingDetails : {
        meetingId: webinar.meetingDetails.meetingId // Only show meeting ID
      }
    };
    
    res.json({
      success: true,
      webinar: filteredWebinar,
      userRegistration: userRegistration ? {
        registeredAt: userRegistration.registeredAt,
        attended: userRegistration.attended,
        certificateIssued: userRegistration.certificateIssued
      } : null
    });
  } catch (error) {
    console.error('Get webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching webinar'
    });
  }
};

const registerWebinar = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    
    const webinar = await Webinar.findOne({ slug });
    
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }
    
    // Check access permissions
    if (webinar.accessType === 'members_only' || webinar.accessType === 'premium_only') {
      const user = await User.findById(userId);
      if (!user.isMembershipActive()) {
        return res.status(403).json({
          success: false,
          message: 'Active membership required for this webinar'
        });
      }
      
      if (webinar.accessType === 'premium_only' && !['premium', 'elite'].includes(user.membership.type)) {
        return res.status(403).json({
          success: false,
          message: 'Premium membership required for this webinar'
        });
      }
    }
    
    await webinar.registerUser(userId);
    
    // Send registration confirmation email
    const user = await User.findById(userId);
    await sendWebinarRegistrationEmail(user, webinar);
    
    res.json({
      success: true,
      message: 'Successfully registered for the webinar'
    });
  } catch (error) {
    console.error('Register webinar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering for webinar'
    });
  }
};

// Utility functions
const checkMembershipAccess = async (userId, requiredMembership) => {
  const user = await User.findById(userId);
  if (!user || !user.isMembershipActive()) return false;
  
  const membershipHierarchy = ['free', 'basic', 'premium', 'elite'];
  const userLevel = membershipHierarchy.indexOf(user.membership.type);
  const requiredLevel = membershipHierarchy.indexOf(requiredMembership);
  
  return userLevel >= requiredLevel;
};

const sendCourseEnrollmentEmail = async (user, course) => {
  const subject = `Welcome to ${course.title} - GSTPAssociation`;
  const content = `
    <h2>Course Enrollment Confirmation</h2>
    <p>Dear ${user.name},</p>
    <p>You have successfully enrolled in the course: <strong>${course.title}</strong></p>
    <p>You can start learning immediately by accessing the course materials.</p>
    <p><a href="${process.env.FRONTEND_URL}/courses/${course.slug}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Learning</a></p>
    <p>Happy learning!</p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendWebinarRegistrationEmail = async (user, webinar) => {
  const subject = `Webinar Registration Confirmed - ${webinar.title}`;
  const content = `
    <h2>Webinar Registration Confirmed</h2>
    <p>Dear ${user.name},</p>
    <p>You have successfully registered for the webinar: <strong>${webinar.title}</strong></p>
    <h3>Webinar Details:</h3>
    <ul>
      <li><strong>Date & Time:</strong> ${webinar.scheduledAt.toLocaleString()}</li>
      <li><strong>Duration:</strong> ${webinar.duration} minutes</li>
      <li><strong>Host:</strong> ${webinar.host.name}</li>
    </ul>
    ${webinar.meetingDetails.joinUrl ? `<p><a href="${webinar.meetingDetails.joinUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Webinar</a></p>` : ''}
    <p>We'll send you a reminder before the webinar starts.</p>
  `;
  
  await sendEmail(user.email, subject, content);
};

module.exports = {
  getArticles,
  getArticle,
  likeArticle,
  addComment,
  getCourses,
  getCourse,
  enrollCourse,
  updateCourseProgress,
  getWebinars,
  getWebinar,
  registerWebinar
};
