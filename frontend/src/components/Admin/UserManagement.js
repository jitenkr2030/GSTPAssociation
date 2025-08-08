import React, { useEffect, useState } from 'react';
import { getUsers, updateUser } from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
              const data = await getUsers();
                    setUsers(data);
                        };
                            fetchUsers();
                              }, []);

                                const handleUpdate = async (userId, updates) => {
                                    try {
                                          await updateUser(userId, updates);
                                                // Refresh user list
                                                    } catch (error) {
                                                          console.error(error);
                                                              }
                                                                };

                                                                  return (
                                                                      <div>
                                                                            <h1>User Management</h1>
                                                                                  <ul>
                                                                                          {users.map((user) => (
                                                                                                    <li key={user.id}>
                                                                                                                {user.name} - {user.role}
                                                                                                                            {/* Add buttons to promote, demote, etc. */}
                                                                                                                                      </li>
                                                                                                                                              ))}
                                                                                                                                                    </ul>
                                                                                                                                                        </div>
                                                                                                                                                          );
                                                                                                                                                          };

                                                                                                                                                          export default UserManagement;
                                                                                                                                                          