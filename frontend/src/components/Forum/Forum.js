import React, { useEffect, useState } from 'react';
import { getPosts } from '../../services/api';
import { Link } from 'react-router-dom';

const Forum = () => {
  const [posts, setPosts] = useState([]);

    useEffect(() => {
        const fetchPosts = async () => {
              const data = await getPosts();
                    setPosts(data);
                        };
                            fetchPosts();
                              }, []);

                                return (
                                    <div>
                                          <h1>Forum</h1>
                                                <Link to="/forum/create">Create New Post</Link>
                                                      <ul>
                                                              {posts.map((post) => (
                                                                        <li key={post.id}>
                                                                                    <Link to={`/forum/${post.id}`}>{post.title}</Link>
                                                                                              </li>
                                                                                                      ))}
                                                                                                            </ul>
                                                                                                                </div>
                                                                                                                  );
                                                                                                                  };

                                                                                                                  export default Forum;
                                                                                                                  