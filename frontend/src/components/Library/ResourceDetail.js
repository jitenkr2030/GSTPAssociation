import React, { useEffect, useState } from 'react';
import { getResource } from '../../services/api';
import { useParams } from 'react-router-dom';

const ResourceDetail = () => {
  const { id } = useParams();
    const [resource, setResource] = useState(null);

      useEffect(() => {
          const fetchResource = async () => {
                const data = await getResource(id);
                      setResource(data);
                          };
                              fetchResource();
                                }, [id]);

                                  if (!resource) return <div>Loading...</div>;

                                    return (
                                        <div>
                                              <h1>{resource.title}</h1>
                                                    <p>{resource.description}</p>
                                                          {/* Add download button, related resources, etc. */}
                                                              </div>
                                                                );
                                                                };

                                                                export default ResourceDetail;
                                                                