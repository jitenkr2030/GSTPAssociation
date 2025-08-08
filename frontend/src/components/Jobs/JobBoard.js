import React, { useEffect, useState } from 'react';
import { getJobs } from '../../services/api';
import { Link } from 'react-router-dom';

const JobList = () => {
  const [jobs, setJobs] = useState([]);

    useEffect(() => {
        const fetchJobs = async () => {
              const data = await getJobs();
                    setJobs(data);
                        };
                            fetchJobs();
                              }, []);

                                return (
                                    <div>
                                          <h1>Job Board</h1>
                                                <ul>
                                                        {jobs.map((job) => (
                                                                  <li key={job.id}>
                                                                              <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                                                                                        </li>
                                                                                                ))}
                                                                                                      </ul>
                                                                                                          </div>
                                                                                                            );
                                                                                                            };

                                                                                                            export default JobList;
                                                                                                            