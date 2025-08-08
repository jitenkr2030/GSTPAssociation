const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Get all membership plans
const getMembershipPlans = async (req, res) => {
  try {
    const memberships = await Membership.find({ isActive: true })
      .sort({ sortOrder: 1 });

    res.json({
      success: true,
      memberships
    });
  } catch (error) {
    console.error('Get membership plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership plans'
    });
  }
};

// Get specific membership plan
const getMembershipPlan = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    res.json({
      success: true,
      membership
    });
  } catch (error) {
    console.error('Get membership plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership plan'
    });
  }
};

// Create membership plan (Admin only)
const createMembershipPlan = async (req, res) => {
  try {
    const membershipData = req.body;

    const membership = new Membership(membershipData);
    await membership.save();

    res.status(201).json({
      success: true,
      message: 'Membership plan created successfully',
      membership
    });
  } catch (error) {
    console.error('Create membership plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating membership plan'
    });
  }
};

// Update membership plan (Admin only)
const updateMembershipPlan = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const updates = req.body;

    const membership = await Membership.findByIdAndUpdate(
      membershipId,
      updates,
      { new: true, runValidators: true }
    );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Membership plan updated successfully',
      membership
    });
  } catch (error) {
    console.error('Update membership plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating membership plan'
    });
  }
};

// Delete membership plan (Admin only)
const deleteMembershipPlan = async (req, res) => {
  try {
    const { membershipId } = req.params;

    // Check if any active subscriptions exist for this membership
    const activeSubscriptions = await Subscription.countDocuments({
      membership: membershipId,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete membership plan with active subscriptions'
      });
    }

    const membership = await Membership.findByIdAndDelete(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Membership plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete membership plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting membership plan'
    });
  }
};

// Get membership comparison
const getMembershipComparison = async (req, res) => {
  try {
    const memberships = await Membership.find({ isActive: true })
      .sort({ sortOrder: 1 });

    // Create comparison matrix
    const allFeatures = [];
    memberships.forEach(membership => {
      membership.features.forEach(feature => {
        if (!allFeatures.find(f => f.name === feature.name)) {
          allFeatures.push({
            name: feature.name,
            description: feature.description
          });
        }
      });
    });

    const comparison = {
      features: allFeatures,
      plans: memberships.map(membership => ({
        _id: membership._id,
        name: membership.name,
        displayName: membership.displayName,
        price: membership.price,
        yearlyDiscount: membership.yearlyDiscount,
        features: allFeatures.map(feature => {
          const membershipFeature = membership.features.find(f => f.name === feature.name);
          return {
            name: feature.name,
            included: membershipFeature ? membershipFeature.included : false,
            limit: membershipFeature ? membershipFeature.limit : 0
          };
        })
      }))
    };

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Get membership comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership comparison'
    });
  }
};

// Check user membership access
const checkMembershipAccess = async (userId, featureName) => {
  try {
    const user = await User.findById(userId).populate('membership');

    if (!user || !user.isMembershipActive()) {
      return { hasAccess: false, reason: 'No active membership' };
    }

    const membership = await Membership.findOne({ name: user.membership.type });

    if (!membership) {
      return { hasAccess: false, reason: 'Membership plan not found' };
    }

    const feature = membership.features.find(f => f.name === featureName);

    if (!feature) {
      return { hasAccess: false, reason: 'Feature not available in plan' };
    }

    if (!feature.included) {
      return { hasAccess: false, reason: 'Feature not included in plan' };
    }

    return {
      hasAccess: true,
      limit: feature.limit,
      membership: membership.name
    };
  } catch (error) {
    console.error('Check membership access error:', error);
    return { hasAccess: false, reason: 'Error checking access' };
  }
};

// Legacy functions for backward compatibility
const getMembershipTiers = getMembershipPlans;
const getUserMembershipStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      membership: user.membership,
      isActive: user.isMembershipActive()
    });
  } catch (error) {
    console.error('Get user membership status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching membership status'
    });
  }
};

const upgradeMembership = async (req, res) => {
  try {
    const { membershipId } = req.body;
    const userId = req.user.id;

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Please complete payment to upgrade membership',
      redirectTo: '/payment',
      membershipId
    });
  } catch (error) {
    console.error('Upgrade membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing membership upgrade'
    });
  }
};

module.exports = {
  getMembershipPlans,
  getMembershipPlan,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  getMembershipComparison,
  checkMembershipAccess,
  getMembershipTiers,
  getUserMembershipStatus,
  upgradeMembership
};
  