import { FETCH_ANALYTICS_SUCCESS, FETCH_ANALYTICS_FAILURE } from '../actions/analyticsActions';

const initialState = {
  analyticsData: null,
    error: null,
    };

    const analyticsReducer = (state = initialState, action) => {
      switch (action.type) {
          case FETCH_ANALYTICS_SUCCESS:
                return {
                        ...state,
                                analyticsData: action.payload,
                                        error: null,
                                              };
                                                  case FETCH_ANALYTICS_FAILURE:
                                                        return {
                                                                ...state,
                                                                        error: action.error,
                                                                              };
                                                                                  default:
                                                                                        return state;
                                                                                          }
                                                                                          };

                                                                                          export default analyticsReducer;
                                                                                          