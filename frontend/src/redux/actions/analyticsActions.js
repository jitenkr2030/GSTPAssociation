import { getAnalyticsData } from '../../services/api';

export const FETCH_ANALYTICS_SUCCESS = 'FETCH_ANALYTICS_SUCCESS';
export const FETCH_ANALYTICS_FAILURE = 'FETCH_ANALYTICS_FAILURE';

export const fetchAnalytics = () => async (dispatch) => {
  try {
      const data = await getAnalyticsData();
          dispatch({ type: FETCH_ANALYTICS_SUCCESS, payload: data });
            } catch (error) {
                dispatch({ type: FETCH_ANALYTICS_FAILURE, error: error.message });
                  }
                  };
                  