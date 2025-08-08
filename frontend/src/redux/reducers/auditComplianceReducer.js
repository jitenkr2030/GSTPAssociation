import {
      SUBMIT_AUDIT_SUCCESS,
        SUBMIT_AUDIT_FAILURE,
          FETCH_COMPLIANCE_STATUS_SUCCESS,
            FETCH_COMPLIANCE_STATUS_FAILURE,
            } from '../actions/auditComplianceActions';

            const initialState = {
              auditData: null,
                complianceStatus: null,
                  error: null,
                  };

                  const auditComplianceReducer = (state = initialState, action) => {
                    switch (action.type) {
                        case SUBMIT_AUDIT_SUCCESS:
                              return {
                                      ...state,
                                              auditData: action.payload,
                                                      error: null,
                                                            };
                                                                case SUBMIT_AUDIT_FAILURE:
                                                                      return {
                                                                              ...state,
                                                                                      error: action.error,
                                                                                            };
                                                                                                case FETCH_COMPLIANCE_STATUS_SUCCESS:
                                                                                                      return {
                                                                                                              ...state,
                                                                                                                      complianceStatus: action.payload,
                                                                                                                              error: null,
                                                                                                                                    };
                                                                                                                                        case FETCH_COMPLIANCE_STATUS_FAILURE:
                                                                                                                                              return {
                                                                                                                                                      ...state,
                                                                                                                                                              error: action.error,
                                                                                                                                                                    };
                                                                                                                                                                        default:
                                                                                                                                                                              return state;
                                                                                                                                                                                }
                                                                                                                                                                                };

                                                                                                                                                                                export default auditComplianceReducer;

