import { submitAuditReport, getComplianceStatus } from '../../services/api';

export const SUBMIT_AUDIT_SUCCESS = 'SUBMIT_AUDIT_SUCCESS';
export const SUBMIT_AUDIT_FAILURE = 'SUBMIT_AUDIT_FAILURE';
export const FETCH_COMPLIANCE_STATUS_SUCCESS = 'FETCH_COMPLIANCE_STATUS_SUCCESS';
export const FETCH_COMPLIANCE_STATUS_FAILURE = 'FETCH_COMPLIANCE_STATUS_FAILURE';

export const submitAudit = (file) => async (dispatch) => {
  try {
      const response = await submitAuditReport(file);
          dispatch({ type: SUBMIT_AUDIT_SUCCESS, payload: response });
            } catch (error) {
                dispatch({ type: SUBMIT_AUDIT_FAILURE, error: error.message });
                  }
                  };

                  export const fetchComplianceStatus = () => async (dispatch) => {
                    try {
                        const status = await getComplianceStatus();
                            dispatch({ type: FETCH_COMPLIANCE_STATUS_SUCCESS, payload: status });
                              } catch (error) {
                                  dispatch({ type: FETCH_COMPLIANCE_STATUS_FAILURE, error: error.message });
                                    }
                                    };
                                    