import { submitReturnFiling } from '../../services/api';

export const SUBMIT_RETURN_SUCCESS = 'SUBMIT_RETURN_SUCCESS';
export const SUBMIT_RETURN_FAILURE = 'SUBMIT_RETURN_FAILURE';

export const submitReturn = (data) => async (dispatch) => {
  try {
      const response = await submitReturnFiling(data);
          dispatch({ type: SUBMIT_RETURN_SUCCESS, payload: response });
            } catch (error) {
                dispatch({ type: SUBMIT_RETURN_FAILURE, error: error.message });
                  }
                  };
                  