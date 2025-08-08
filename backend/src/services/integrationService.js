const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const Invoice = require('../models/Invoice');
const { sendEmail } = require('../utils/emailUtils');

// GSTN Portal Integration
class GSTNIntegration {
  constructor() {
    this.baseURL = process.env.GSTN_API_URL || 'https://api.gst.gov.in';
    this.clientId = process.env.GSTN_CLIENT_ID;
    this.clientSecret = process.env.GSTN_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      if (this.accessToken && this.tokenExpiry > new Date()) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.baseURL}/taxpayerapi/v1.0/authenticate`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('GSTN authentication error:', error);
      throw new Error('Failed to authenticate with GSTN portal');
    }
  }

  async validateGSTIN(gstin) {
    try {
      await this.authenticate();
      
      const response = await axios.get(`${this.baseURL}/taxpayerapi/v1.0/search`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { gstin }
      });

      return {
        isValid: response.data.status === 'Active',
        details: response.data
      };
    } catch (error) {
      console.error('GSTIN validation error:', error);
      return { isValid: false, error: error.message };
    }
  }

  async fileGSTReturn(returnData) {
    try {
      await this.authenticate();
      
      const response = await axios.post(`${this.baseURL}/taxpayerapi/v1.0/returns`, returnData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        acknowledgmentNumber: response.data.ack_num,
        referenceId: response.data.reference_id,
        status: response.data.status
      };
    } catch (error) {
      console.error('GST return filing error:', error);
      return { success: false, error: error.message };
    }
  }

  async generateEWayBill(eWayBillData) {
    try {
      await this.authenticate();
      
      const response = await axios.post(`${this.baseURL}/taxpayerapi/v1.0/ewayapi`, eWayBillData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        ewbNo: response.data.ewayBillNo,
        ewbDate: response.data.ewayBillDate,
        validUpto: response.data.validUpto
      };
    } catch (error) {
      console.error('E-Way Bill generation error:', error);
      return { success: false, error: error.message };
    }
  }

  async getReturnStatus(gstin, returnPeriod, returnType) {
    try {
      await this.authenticate();
      
      const response = await axios.get(`${this.baseURL}/taxpayerapi/v1.0/returns/status`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { gstin, ret_period: returnPeriod, return_type: returnType }
      });

      return response.data;
    } catch (error) {
      console.error('Return status check error:', error);
      throw error;
    }
  }
}

// Accounting Software Integration
class AccountingSoftwareIntegration {
  constructor() {
    this.integrations = {
      tally: new TallyIntegration(),
      quickbooks: new QuickBooksIntegration(),
      zoho: new ZohoIntegration(),
      sage: new SageIntegration()
    };
  }

  async connectSoftware(userId, softwareType, credentials) {
    try {
      const integration = this.integrations[softwareType];
      if (!integration) {
        throw new Error('Unsupported accounting software');
      }

      const connectionResult = await integration.connect(credentials);
      
      if (connectionResult.success) {
        // Store connection details in user profile
        await User.findByIdAndUpdate(userId, {
          $set: {
            'integrations.accounting': {
              software: softwareType,
              connected: true,
              connectedAt: new Date(),
              credentials: this.encryptCredentials(credentials)
            }
          }
        });

        return { success: true, message: 'Successfully connected to accounting software' };
      }

      return connectionResult;
    } catch (error) {
      console.error('Accounting software connection error:', error);
      return { success: false, error: error.message };
    }
  }

  async syncData(userId, dataType = 'all') {
    try {
      const user = await User.findById(userId);
      const integration = user.integrations?.accounting;
      
      if (!integration || !integration.connected) {
        throw new Error('No accounting software connected');
      }

      const softwareIntegration = this.integrations[integration.software];
      const credentials = this.decryptCredentials(integration.credentials);
      
      await softwareIntegration.connect(credentials);
      
      let syncResults = {};
      
      if (dataType === 'all' || dataType === 'invoices') {
        syncResults.invoices = await softwareIntegration.syncInvoices(userId);
      }
      
      if (dataType === 'all' || dataType === 'purchases') {
        syncResults.purchases = await softwareIntegration.syncPurchases(userId);
      }
      
      if (dataType === 'all' || dataType === 'customers') {
        syncResults.customers = await softwareIntegration.syncCustomers(userId);
      }

      return { success: true, syncResults };
    } catch (error) {
      console.error('Data sync error:', error);
      return { success: false, error: error.message };
    }
  }

  encryptCredentials(credentials) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptCredentials(encryptedCredentials) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedCredentials, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}

// Tally Integration
class TallyIntegration {
  constructor() {
    this.baseURL = 'http://localhost:9000'; // Default Tally port
  }

  async connect(credentials) {
    try {
      const response = await axios.get(`${credentials.serverUrl || this.baseURL}/api/company`, {
        timeout: 5000
      });
      
      return { success: true, companies: response.data };
    } catch (error) {
      return { success: false, error: 'Unable to connect to Tally server' };
    }
  }

  async syncInvoices(userId) {
    try {
      // Implementation for syncing invoices from Tally
      const response = await axios.get(`${this.baseURL}/api/vouchers/sales`);
      
      const invoices = response.data.map(invoice => ({
        externalId: invoice.voucherId,
        invoiceNumber: invoice.voucherNumber,
        date: new Date(invoice.date),
        customerName: invoice.partyName,
        amount: invoice.amount,
        taxAmount: invoice.taxAmount,
        source: 'tally'
      }));

      // Store invoices in database
      // Implementation would save to Invoice model

      return { count: invoices.length, invoices };
    } catch (error) {
      throw new Error('Failed to sync invoices from Tally');
    }
  }

  async syncPurchases(userId) {
    // Similar implementation for purchases
    return { count: 0, purchases: [] };
  }

  async syncCustomers(userId) {
    // Similar implementation for customers
    return { count: 0, customers: [] };
  }
}

// QuickBooks Integration
class QuickBooksIntegration {
  constructor() {
    this.baseURL = 'https://sandbox-quickbooks.api.intuit.com';
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID;
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  }

  async connect(credentials) {
    try {
      // OAuth 2.0 flow for QuickBooks
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        grant_type: 'authorization_code',
        code: credentials.authCode,
        redirect_uri: credentials.redirectUri
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return { 
        success: true, 
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        companyId: credentials.companyId
      };
    } catch (error) {
      return { success: false, error: 'QuickBooks authentication failed' };
    }
  }

  async syncInvoices(userId) {
    // Implementation for QuickBooks invoice sync
    return { count: 0, invoices: [] };
  }

  async syncPurchases(userId) {
    return { count: 0, purchases: [] };
  }

  async syncCustomers(userId) {
    return { count: 0, customers: [] };
  }
}

// Zoho Integration
class ZohoIntegration {
  constructor() {
    this.baseURL = 'https://books.zoho.in/api/v3';
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
  }

  async connect(credentials) {
    try {
      const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: credentials.authCode,
        redirect_uri: credentials.redirectUri
      });

      return { 
        success: true, 
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token
      };
    } catch (error) {
      return { success: false, error: 'Zoho authentication failed' };
    }
  }

  async syncInvoices(userId) {
    return { count: 0, invoices: [] };
  }

  async syncPurchases(userId) {
    return { count: 0, purchases: [] };
  }

  async syncCustomers(userId) {
    return { count: 0, customers: [] };
  }
}

// Sage Integration
class SageIntegration {
  constructor() {
    this.baseURL = 'https://api.sage.com/accounts/v3.1';
  }

  async connect(credentials) {
    return { success: false, error: 'Sage integration coming soon' };
  }

  async syncInvoices(userId) {
    return { count: 0, invoices: [] };
  }

  async syncPurchases(userId) {
    return { count: 0, purchases: [] };
  }

  async syncCustomers(userId) {
    return { count: 0, customers: [] };
  }
}

// Enhanced Payment Gateway Integration
class EnhancedPaymentIntegration {
  constructor() {
    this.gateways = {
      razorpay: new RazorpayEnhanced(),
      stripe: new StripeEnhanced(),
      payu: new PayUIntegration(),
      ccavenue: new CCAvenue(),
      instamojo: new Instamojo()
    };
  }

  async processPayment(paymentData, gateway = 'razorpay') {
    try {
      const paymentGateway = this.gateways[gateway];
      if (!paymentGateway) {
        throw new Error('Unsupported payment gateway');
      }

      return await paymentGateway.processPayment(paymentData);
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  async setupRecurringPayment(subscriptionData, gateway = 'razorpay') {
    try {
      const paymentGateway = this.gateways[gateway];
      return await paymentGateway.setupRecurring(subscriptionData);
    } catch (error) {
      console.error('Recurring payment setup error:', error);
      throw error;
    }
  }

  async refundPayment(paymentId, amount, gateway = 'razorpay') {
    try {
      const paymentGateway = this.gateways[gateway];
      return await paymentGateway.refund(paymentId, amount);
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }
}

// Banking & UPI Integration
class BankingUPIIntegration {
  constructor() {
    this.upiProviders = {
      phonepe: new PhonePeIntegration(),
      googlepay: new GooglePayIntegration(),
      paytm: new PaytmIntegration(),
      bhim: new BhimIntegration()
    };
  }

  async initiateUPIPayment(paymentData, provider = 'phonepe') {
    try {
      const upiProvider = this.upiProviders[provider];
      if (!upiProvider) {
        throw new Error('Unsupported UPI provider');
      }

      return await upiProvider.initiatePayment(paymentData);
    } catch (error) {
      console.error('UPI payment initiation error:', error);
      throw error;
    }
  }

  async verifyUPIPayment(transactionId, provider = 'phonepe') {
    try {
      const upiProvider = this.upiProviders[provider];
      return await upiProvider.verifyPayment(transactionId);
    } catch (error) {
      console.error('UPI payment verification error:', error);
      throw error;
    }
  }

  async getBankAccountDetails(accountNumber, ifscCode) {
    try {
      // Integration with bank verification APIs
      const response = await axios.get(`https://api.bankverification.com/verify`, {
        params: { account: accountNumber, ifsc: ifscCode },
        headers: { 'Authorization': `Bearer ${process.env.BANK_VERIFICATION_API_KEY}` }
      });

      return {
        isValid: response.data.valid,
        accountHolderName: response.data.name,
        bankName: response.data.bank_name,
        branchName: response.data.branch_name
      };
    } catch (error) {
      console.error('Bank account verification error:', error);
      return { isValid: false, error: error.message };
    }
  }
}

// Placeholder classes for payment providers
class RazorpayEnhanced {
  async processPayment(data) { return { success: true }; }
  async setupRecurring(data) { return { success: true }; }
  async refund(id, amount) { return { success: true }; }
}

class StripeEnhanced {
  async processPayment(data) { return { success: true }; }
  async setupRecurring(data) { return { success: true }; }
  async refund(id, amount) { return { success: true }; }
}

class PayUIntegration {
  async processPayment(data) { return { success: true }; }
  async setupRecurring(data) { return { success: true }; }
  async refund(id, amount) { return { success: true }; }
}

class CCAvenue {
  async processPayment(data) { return { success: true }; }
  async setupRecurring(data) { return { success: true }; }
  async refund(id, amount) { return { success: true }; }
}

class Instamojo {
  async processPayment(data) { return { success: true }; }
  async setupRecurring(data) { return { success: true }; }
  async refund(id, amount) { return { success: true }; }
}

class PhonePeIntegration {
  async initiatePayment(data) { return { success: true }; }
  async verifyPayment(id) { return { success: true }; }
}

class GooglePayIntegration {
  async initiatePayment(data) { return { success: true }; }
  async verifyPayment(id) { return { success: true }; }
}

class PaytmIntegration {
  async initiatePayment(data) { return { success: true }; }
  async verifyPayment(id) { return { success: true }; }
}

class BhimIntegration {
  async initiatePayment(data) { return { success: true }; }
  async verifyPayment(id) { return { success: true }; }
}

// Export instances
const gstnIntegration = new GSTNIntegration();
const accountingIntegration = new AccountingSoftwareIntegration();
const paymentIntegration = new EnhancedPaymentIntegration();
const bankingIntegration = new BankingUPIIntegration();

module.exports = {
  gstnIntegration,
  accountingIntegration,
  paymentIntegration,
  bankingIntegration,
  GSTNIntegration,
  AccountingSoftwareIntegration,
  EnhancedPaymentIntegration,
  BankingUPIIntegration
};
