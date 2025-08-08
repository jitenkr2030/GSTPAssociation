const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { sendEmail } = require('../utils/emailUtils');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment intent (Stripe)
const createStripePaymentIntent = async (req, res) => {
  try {
    const { membershipId, billingCycle, couponCode } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    let amount = membership.price[billingCycle];

    // Apply coupon if provided
    if (couponCode) {
      // Implement coupon logic here
      // amount = applyDiscount(amount, couponCode);
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    if (user.paymentDetails?.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(user.paymentDetails.stripeCustomerId);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString()
        }
      });

      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(userId, {
        'paymentDetails.stripeCustomerId': stripeCustomer.id
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'inr',
      customer: stripeCustomer.id,
      metadata: {
        userId: userId.toString(),
        membershipId: membershipId.toString(),
        billingCycle
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    });
  }
};

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
  try {
    const { membershipId, billingCycle, couponCode } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    let amount = membership.price[billingCycle];

    // Apply coupon if provided
    if (couponCode) {
      // Implement coupon logic here
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        membershipId: membershipId.toString(),
        billingCycle
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }
};

// Confirm payment and create subscription
const confirmPayment = async (req, res) => {
  try {
    const {
      paymentIntentId,
      membershipId,
      billingCycle,
      paymentMethod = 'stripe',
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    } = req.body;
    const userId = req.user.id;

    let paymentVerified = false;
    let paymentDetails = {};

    // Verify payment based on method
    if (paymentMethod === 'stripe' && paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      paymentVerified = paymentIntent.status === 'succeeded';
      paymentDetails = {
        paymentMethodId: paymentIntent.payment_method,
        transactionId: paymentIntentId
      };
    } else if (paymentMethod === 'razorpay' && razorpayPaymentId) {
      // Verify Razorpay signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      paymentVerified = expectedSignature === razorpaySignature;
      paymentDetails = {
        paymentMethodId: razorpayPaymentId,
        transactionId: razorpayPaymentId,
        orderId: razorpayOrderId
      };
    }

    if (!paymentVerified) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    const membership = await Membership.findById(membershipId);
    const user = await User.findById(userId);

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription
    const subscription = new Subscription({
      user: userId,
      membership: membershipId,
      status: 'active',
      billingCycle,
      startDate,
      endDate,
      nextBillingDate: endDate,
      amount: membership.price[billingCycle],
      paymentMethod,
      paymentDetails,
      autoRenewal: true
    });

    await subscription.save();

    // Update user membership
    await User.findByIdAndUpdate(userId, {
      'membership.type': membership.name,
      'membership.startDate': startDate,
      'membership.endDate': endDate,
      'membership.autoRenewal': true
    });

    // Create invoice
    const invoice = new Invoice({
      user: userId,
      subscription: subscription._id,
      type: 'subscription',
      status: 'paid',
      dueDate: startDate,
      paidDate: new Date(),
      items: [{
        description: `${membership.displayName} - ${billingCycle} subscription`,
        quantity: 1,
        unitPrice: membership.price[billingCycle],
        totalPrice: membership.price[billingCycle],
        taxRate: 18,
        taxAmount: (membership.price[billingCycle] * 18) / 118
      }],
      subtotal: membership.price[billingCycle],
      taxTotal: (membership.price[billingCycle] * 18) / 118,
      total: membership.price[billingCycle],
      paymentMethod,
      paymentDetails,
      billingAddress: {
        name: user.name,
        email: user.email,
        phone: user.mobile
      }
    });

    await invoice.save();

    // Send confirmation email
    await sendSubscriptionConfirmationEmail(user, membership, subscription, invoice);

    res.json({
      success: true,
      message: 'Payment confirmed and subscription activated',
      subscription: subscription,
      invoice: invoice
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment'
    });
  }
};

// Get user subscriptions
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await Subscription.find({ user: userId })
      .populate('membership')
      .populate('invoices')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions'
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    await subscription.cancel(reason);

    // Update user membership to free
    await User.findByIdAndUpdate(userId, {
      'membership.type': 'free',
      'membership.autoRenewal': false
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    });
  }
};

// Legacy functions for backward compatibility
const processPayment = async (paymentData) => {
    const newPayment = new Payment(paymentData);
    await newPayment.save();
    return newPayment;
};

const getPaymentDetails = async (paymentId) => {
    return await Payment.findById(paymentId);
};

// Utility function to send subscription confirmation email
const sendSubscriptionConfirmationEmail = async (user, membership, subscription, invoice) => {
  const emailContent = `
    <h2>Welcome to ${membership.displayName}!</h2>
    <p>Dear ${user.name},</p>
    <p>Thank you for subscribing to our ${membership.displayName} plan. Your subscription is now active!</p>

    <h3>Subscription Details:</h3>
    <ul>
      <li><strong>Plan:</strong> ${membership.displayName}</li>
      <li><strong>Billing Cycle:</strong> ${subscription.billingCycle}</li>
      <li><strong>Amount:</strong> ₹${subscription.amount}</li>
      <li><strong>Start Date:</strong> ${subscription.startDate.toDateString()}</li>
      <li><strong>End Date:</strong> ${subscription.endDate.toDateString()}</li>
      <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
    </ul>

    <p>You can now access all the premium features included in your plan.</p>
    <p>Thank you for choosing GSTPAssociation!</p>
  `;

  await sendEmail(user.email, 'Subscription Confirmed - GSTPAssociation', emailContent);
};

module.exports = {
  createStripePaymentIntent,
  createRazorpayOrder,
  confirmPayment,
  getUserSubscriptions,
  cancelSubscription,
  processPayment,
  getPaymentDetails
};
