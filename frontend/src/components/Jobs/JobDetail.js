import React, { useEffect, useState } from 'react';
import { getJob } from '../../services/api';
import { useParams } from 'react-router-dom';

const JobDetail = () => {
  const { id } = useParams();
    const [job, setJob] = useState(null);

      useEffect(() => {
          const fetchJob = async () => {
                const data = await getJob(id);
                      setJob(data);
                          };
                              fetchJob();
                                }, [id]);

                                  if (!job) return <div>Loading...</div>;

                                    return (
                                        <div>
                                              <h1>{job.title}</h1>
                                                    <p>{job.description}</p>
                                                          {/* Add apply button, share, etc. */}
                                                              </div>
                                                                );
                                                                };

                                                                export default JobDetail;
                                                                