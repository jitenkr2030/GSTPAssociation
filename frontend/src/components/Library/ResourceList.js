import React, { useEffect, useState } from 'react';
import { getResources } from '../../services/api';
import { Link } from 'react-router-dom';

const ResourceList = () => {
  const [resources, setResources] = useState([]);

    useEffect(() => {
        const fetchResources = async () => {
              const data = await getResources();
                    setResources(data);
                        };
                            fetchResources();
                              }, []);

                                return (
                                    <div>
                                          <h1>Resource Library</h1>
                                                <ul>
                                                        {resources.map((resource) => (
                                                                  <li key={resource.id}>
                                                                              <Link to={`/library/${resource.id}`}>{resource.title}</Link>
                                                                                        </li>
                                                                                                ))}
                                                                                                      </ul>
                                                                                                          </div>
                                                                                                            );
                                                                                                            };

                                                                                                            export default ResourceList;
                                                                                                            