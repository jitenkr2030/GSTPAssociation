import { combineReducers } from 'redux';
import authReducer from './authReducer';
import returnFilingReducer from './returnFilingReducer';
import auditComplianceReducer from './auditComplianceReducer';
import paymentReducer from './paymentReducer';
import analyticsReducer from './analyticsReducer';

const rootReducer = combineReducers({
  auth: authReducer,
    returnFiling: returnFilingReducer,
      auditCompliance: auditComplianceReducer,
        payment: paymentReducer,
          analytics: analyticsReducer,
          });

          export default rootReducer;
          