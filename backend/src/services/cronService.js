const cron = require('node-cron');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Membership = require('../models/Membership');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// Auto-renewal job - runs daily at 2 AM
const autoRenewalJob = cron.schedule('0 2 * * *', async () => {
  console.log('Running auto-renewal job...');
  
  try {
    // Find subscriptions that need renewal (ending today and have auto-renewal enabled)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const subscriptionsToRenew = await Subscription.find({
      status: 'active',
      autoRenewal: true,
      endDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('user membership');

    console.log(`Found ${subscriptionsToRenew.length} subscriptions to renew`);

    for (const subscription of subscriptionsToRenew) {
      try {
        await processAutoRenewal(subscription);
      } catch (error) {
        console.error(`Failed to renew subscription ${subscription._id}:`, error);
        
        // Mark renewal attempt
        subscription.renewalAttempts += 1;
        subscription.lastRenewalAttempt = new Date();
        
        if (subscription.renewalAttempts >= 3) {
          // Cancel subscription after 3 failed attempts
          await subscription.cancel('Auto-renewal failed after 3 attempts');
          
          // Send cancellation email
          await sendSubscriptionCancellationEmail(subscription.user, subscription, 'Auto-renewal failed');
        }
        
        await subscription.save();
      }
    }
  } catch (error) {
    console.error('Auto-renewal job error:', error);
  }
}, {
  scheduled: false
});

// Expiry reminder job - runs daily at 9 AM
const expiryReminderJob = cron.schedule('0 9 * * *', async () => {
  console.log('Running expiry reminder job...');
  
  try {
    // Find subscriptions expiring in 7, 3, and 1 days
    const reminderDays = [7, 3, 1];
    
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        endDate: {
          $gte: targetDate,
          $lt: nextDay
        }
      }).populate('user membership');

      console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in ${days} days`);

      for (const subscription of expiringSubscriptions) {
        try {
          await sendExpiryReminderEmail(subscription.user, subscription, days);
          
          // Send SMS if user has mobile and SMS notifications enabled
          if (subscription.user.mobile && subscription.user.preferences?.notifications?.sms) {
            await sendExpiryReminderSMS(subscription.user.mobile, subscription.membership.displayName, days);
          }
        } catch (error) {
          console.error(`Failed to send expiry reminder for subscription ${subscription._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Expiry reminder job error:', error);
  }
}, {
  scheduled: false
});

// Expired subscription cleanup job - runs daily at 3 AM
const expiredSubscriptionCleanupJob = cron.schedule('0 3 * * *', async () => {
  console.log('Running expired subscription cleanup job...');
  
  try {
    const expiredSubscriptions = await Subscription.findExpired();
    
    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

    for (const subscription of expiredSubscriptions) {
      try {
        // Update subscription status
        subscription.status = 'expired';
        await subscription.save();

        // Update user membership to free
        await User.findByIdAndUpdate(subscription.user._id, {
          'membership.type': 'free',
          'membership.endDate': null,
          'membership.autoRenewal': false
        });

        // Send expiry notification
        await sendSubscriptionExpiredEmail(subscription.user, subscription);
        
        console.log(`Expired subscription ${subscription._id} for user ${subscription.user.email}`);
      } catch (error) {
        console.error(`Failed to process expired subscription ${subscription._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Expired subscription cleanup job error:', error);
  }
}, {
  scheduled: false
});

// Overdue invoice reminder job - runs daily at 10 AM
const overdueInvoiceReminderJob = cron.schedule('0 10 * * *', async () => {
  console.log('Running overdue invoice reminder job...');
  
  try {
    const overdueInvoices = await Invoice.findOverdue();
    
    console.log(`Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      try {
        // Send reminder only if less than 3 reminders sent
        if (invoice.remindersSent < 3) {
          await sendOverdueInvoiceEmail(invoice.user, invoice);
          await invoice.sendReminder();
          
          console.log(`Sent overdue reminder for invoice ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        console.error(`Failed to send overdue reminder for invoice ${invoice._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Overdue invoice reminder job error:', error);
  }
}, {
  scheduled: false
});

// Helper function to process auto-renewal
const processAutoRenewal = async (subscription) => {
  // This would integrate with payment gateway to charge the customer
  // For now, we'll simulate successful renewal
  
  const duration = subscription.billingCycle === 'monthly' ? 30 : 365;
  await subscription.renew(duration);
  
  // Create new invoice
  const invoice = new Invoice({
    user: subscription.user._id,
    subscription: subscription._id,
    type: 'subscription',
    status: 'paid',
    dueDate: new Date(),
    paidDate: new Date(),
    items: [{
      description: `${subscription.membership.displayName} - ${subscription.billingCycle} subscription (Auto-renewal)`,
      quantity: 1,
      unitPrice: subscription.amount,
      totalPrice: subscription.amount,
      taxRate: 18,
      taxAmount: (subscription.amount * 18) / 118
    }],
    subtotal: subscription.amount,
    taxTotal: (subscription.amount * 18) / 118,
    total: subscription.amount,
    paymentMethod: subscription.paymentMethod,
    billingAddress: {
      name: subscription.user.name,
      email: subscription.user.email,
      phone: subscription.user.mobile
    }
  });

  await invoice.save();
  
  // Send renewal confirmation email
  await sendRenewalConfirmationEmail(subscription.user, subscription, invoice);
  
  console.log(`Successfully renewed subscription ${subscription._id}`);
};

// Email templates
const sendExpiryReminderEmail = async (user, subscription, days) => {
  const subject = `Your GSTPAssociation membership expires in ${days} day${days > 1 ? 's' : ''}`;
  const content = `
    <h2>Membership Expiry Reminder</h2>
    <p>Dear ${user.name},</p>
    <p>Your ${subscription.membership.displayName} membership will expire in ${days} day${days > 1 ? 's' : ''} on ${subscription.endDate.toDateString()}.</p>
    <p>To continue enjoying premium features, please renew your membership before it expires.</p>
    <p><a href="${process.env.FRONTEND_URL}/membership/renew" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Now</a></p>
    <p>Thank you for being a valued member!</p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendRenewalConfirmationEmail = async (user, subscription, invoice) => {
  const subject = 'Membership Renewed Successfully - GSTPAssociation';
  const content = `
    <h2>Membership Renewed Successfully!</h2>
    <p>Dear ${user.name},</p>
    <p>Your ${subscription.membership.displayName} membership has been automatically renewed.</p>
    <h3>Renewal Details:</h3>
    <ul>
      <li><strong>Plan:</strong> ${subscription.membership.displayName}</li>
      <li><strong>Amount:</strong> ₹${subscription.amount}</li>
      <li><strong>New Expiry Date:</strong> ${subscription.endDate.toDateString()}</li>
      <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
    </ul>
    <p>Thank you for continuing with GSTPAssociation!</p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendSubscriptionExpiredEmail = async (user, subscription) => {
  const subject = 'Your GSTPAssociation membership has expired';
  const content = `
    <h2>Membership Expired</h2>
    <p>Dear ${user.name},</p>
    <p>Your ${subscription.membership.displayName} membership has expired on ${subscription.endDate.toDateString()}.</p>
    <p>You now have access to our free tier features. To regain access to premium features, please renew your membership.</p>
    <p><a href="${process.env.FRONTEND_URL}/membership/plans" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Plans</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendSubscriptionCancellationEmail = async (user, subscription, reason) => {
  const subject = 'Your GSTPAssociation membership has been cancelled';
  const content = `
    <h2>Membership Cancelled</h2>
    <p>Dear ${user.name},</p>
    <p>Your ${subscription.membership.displayName} membership has been cancelled.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>You can reactivate your membership at any time by visiting our plans page.</p>
    <p><a href="${process.env.FRONTEND_URL}/membership/plans" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Plans</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendOverdueInvoiceEmail = async (user, invoice) => {
  const subject = `Overdue Invoice Reminder - ${invoice.invoiceNumber}`;
  const content = `
    <h2>Payment Overdue</h2>
    <p>Dear ${user.name},</p>
    <p>Your invoice ${invoice.invoiceNumber} is overdue by ${invoice.daysOverdue} days.</p>
    <p><strong>Amount Due:</strong> ₹${invoice.total}</p>
    <p><strong>Due Date:</strong> ${invoice.dueDate.toDateString()}</p>
    <p>Please make the payment as soon as possible to avoid service interruption.</p>
    <p><a href="${process.env.FRONTEND_URL}/invoices/${invoice._id}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

// Start all cron jobs
const startCronJobs = () => {
  autoRenewalJob.start();
  expiryReminderJob.start();
  expiredSubscriptionCleanupJob.start();
  overdueInvoiceReminderJob.start();
  
  console.log('All cron jobs started successfully');
};

// Stop all cron jobs
const stopCronJobs = () => {
  autoRenewalJob.stop();
  expiryReminderJob.stop();
  expiredSubscriptionCleanupJob.stop();
  overdueInvoiceReminderJob.stop();
  
  console.log('All cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  autoRenewalJob,
  expiryReminderJob,
  expiredSubscriptionCleanupJob,
  overdueInvoiceReminderJob
};
