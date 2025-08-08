const mongoose = require('mongoose');
const Membership = require('../../backend/src/models/Membership');

const membershipPlans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Basic access to GSTPAssociation platform with limited features',
    price: {
      monthly: 0,
      yearly: 0
    },
    features: [
      {
        name: 'forum_access',
        description: 'Access to community forum',
        included: true,
        limit: -1
      },
      {
        name: 'basic_resources',
        description: 'Access to basic GST resources',
        included: true,
        limit: 10
      },
      {
        name: 'gst_calculator',
        description: 'Basic GST calculator',
        included: true,
        limit: 5
      },
      {
        name: 'news_updates',
        description: 'GST news and updates',
        included: true,
        limit: -1
      }
    ],
    benefits: [
      'Community forum access',
      'Basic GST resources',
      'GST news and updates',
      'Basic GST calculator (5 calculations/month)'
    ],
    limitations: [
      'Limited resource access',
      'No premium tools',
      'No expert consultation',
      'Basic support only'
    ],
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'basic',
    displayName: 'Basic Membership',
    description: 'Enhanced features for GST practitioners with essential tools and resources',
    price: {
      monthly: 199,
      yearly: 2000
    },
    features: [
      {
        name: 'forum_access',
        description: 'Full access to community forum',
        included: true,
        limit: -1
      },
      {
        name: 'resource_library',
        description: 'Access to comprehensive resource library',
        included: true,
        limit: -1
      },
      {
        name: 'gst_calculator',
        description: 'Advanced GST calculator',
        included: true,
        limit: -1
      },
      {
        name: 'job_board',
        description: 'Job board access',
        included: true,
        limit: 10
      },
      {
        name: 'automated_reminders',
        description: 'GST compliance reminders',
        included: true,
        limit: -1
      },
      {
        name: 'email_support',
        description: 'Email support',
        included: true,
        limit: -1
      }
    ],
    benefits: [
      'All Free features',
      'Comprehensive resource library',
      'Advanced GST calculator',
      'Job board access (10 applications/month)',
      'Automated compliance reminders',
      'Email support'
    ],
    limitations: [
      'No GST return filing',
      'No expert consultation',
      'Limited job applications',
      'No priority support'
    ],
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'premium',
    displayName: 'Premium Membership',
    description: 'Professional-grade tools and services for serious GST practitioners',
    price: {
      monthly: 499,
      yearly: 5000
    },
    features: [
      {
        name: 'forum_access',
        description: 'Full access to community forum',
        included: true,
        limit: -1
      },
      {
        name: 'resource_library',
        description: 'Access to premium resource library',
        included: true,
        limit: -1
      },
      {
        name: 'gst_calculator',
        description: 'Advanced GST calculator with all features',
        included: true,
        limit: -1
      },
      {
        name: 'gst_return_filing',
        description: 'GST return filing assistance',
        included: true,
        limit: 12
      },
      {
        name: 'audit_compliance',
        description: 'GST audit and compliance tools',
        included: true,
        limit: -1
      },
      {
        name: 'job_board',
        description: 'Unlimited job board access',
        included: true,
        limit: -1
      },
      {
        name: 'document_management',
        description: 'Document management system',
        included: true,
        limit: 1000
      },
      {
        name: 'custom_reports',
        description: 'Custom report generation',
        included: true,
        limit: 50
      },
      {
        name: 'priority_support',
        description: 'Priority email and chat support',
        included: true,
        limit: -1
      },
      {
        name: 'webinar_access',
        description: 'Access to premium webinars',
        included: true,
        limit: -1
      }
    ],
    benefits: [
      'All Basic features',
      'GST return filing (12 returns/year)',
      'Audit and compliance tools',
      'Unlimited job board access',
      'Document management (1000 docs)',
      'Custom report generation (50/month)',
      'Priority support',
      'Premium webinar access'
    ],
    limitations: [
      'No AI-powered features',
      'No expert consultation',
      'Limited custom reports',
      'No client management tools'
    ],
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'elite',
    displayName: 'Elite Membership',
    description: 'Complete GST solution with AI-powered features and expert consultation',
    price: {
      monthly: 999,
      yearly: 10000
    },
    features: [
      {
        name: 'forum_access',
        description: 'VIP access to community forum',
        included: true,
        limit: -1
      },
      {
        name: 'resource_library',
        description: 'Access to complete resource library',
        included: true,
        limit: -1
      },
      {
        name: 'gst_calculator',
        description: 'AI-powered GST calculator',
        included: true,
        limit: -1
      },
      {
        name: 'gst_return_filing',
        description: 'Unlimited GST return filing',
        included: true,
        limit: -1
      },
      {
        name: 'audit_compliance',
        description: 'Advanced audit and compliance tools',
        included: true,
        limit: -1
      },
      {
        name: 'ai_advisory',
        description: 'AI-powered GST advisory bot',
        included: true,
        limit: -1
      },
      {
        name: 'expert_consultation',
        description: 'One-on-one expert consultation',
        included: true,
        limit: 4
      },
      {
        name: 'client_management',
        description: 'Client management tools',
        included: true,
        limit: -1
      },
      {
        name: 'advanced_analytics',
        description: 'Advanced analytics and insights',
        included: true,
        limit: -1
      },
      {
        name: 'api_access',
        description: 'API access for integrations',
        included: true,
        limit: 10000
      },
      {
        name: 'white_label',
        description: 'White-label solutions',
        included: true,
        limit: 1
      },
      {
        name: 'dedicated_support',
        description: 'Dedicated account manager',
        included: true,
        limit: -1
      }
    ],
    benefits: [
      'All Premium features',
      'Unlimited GST return filing',
      'AI-powered GST advisory bot',
      'Expert consultation (4 sessions/month)',
      'Client management tools',
      'Advanced analytics and insights',
      'API access (10,000 calls/month)',
      'White-label solutions',
      'Dedicated account manager',
      'Priority feature requests'
    ],
    limitations: [],
    isActive: true,
    sortOrder: 4
  }
];

const seedMemberships = async () => {
  try {
    // Clear existing memberships
    await Membership.deleteMany({});
    console.log('Cleared existing membership plans');

    // Insert new membership plans
    const createdMemberships = await Membership.insertMany(membershipPlans);
    console.log(`Created ${createdMemberships.length} membership plans`);

    return createdMemberships;
  } catch (error) {
    console.error('Error seeding memberships:', error);
    throw error;
  }
};

module.exports = {
  seedMemberships,
  membershipPlans
};
