import { makePayment } from '../../services/api';

export const PAYMENT_SUCCESS = 'PAYMENT_SUCCESS';
export const PAYMENT_FAILURE = 'PAYMENT_FAILURE';

export const processPayment = (data) => async (dispatch) => {
  try {
      const response = await makePayment(data);
          dispatch({ type: PAYMENT_SUCCESS, payload: response });
            } catch (error) {
                dispatch({ type: PAYMENT_FAILURE, error: error.message });
                  }
                  };
                  