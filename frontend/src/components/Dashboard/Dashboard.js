import React from 'react';
import { useSelector } from 'react-redux';

const Dashboard = () => {
  const user = useSelector((state) => state.user);

    return (
        <div>
              <h1>Welcome, {user.name}</h1>
                    {/* Add more dashboard widgets */}
                        </div>
                          );
                          };

                          export default Dashboard;
                          