const ForumPost = require('../models/ForumPost'); // Assuming ForumPost model

exports.createPost = async (req, res) => {
    try {
            const newPost = new ForumPost({
                        title: req.body.title,
                                    content: req.body.content,
                                                user: req.user.id,
                                                        });

                                                                const post = await newPost.save();
                                                                        res.status(201).json(post);
                                                                            } catch (error) {
                                                                                    res.status(500).json({ error: error.message });
                                                                                        }
                                                                                        };

                                                                                        exports.getPosts = async (req, res) => {
                                                                                            try {
                                                                                                    const posts = await ForumPost.find().populate('user', 'name');
                                                                                                            res.status(200).json(posts);
                                                                                                                } catch (error) {
                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                            }
                                                                                                                            };

                                                                                                                            exports.deletePost = async (req, res) => {
                                                                                                                                try {
                                                                                                                                        const post = await ForumPost.findById(req.params.id);

                                                                                                                                                if (!post) {
                                                                                                                                                            return res.status(404).json({ error: 'Post not found' });
                                                                                                                                                                    }

                                                                                                                                                                            if (post.user.toString() !== req.user.id) {
                                                                                                                                                                                        return res.status(403).json({ error: 'Unauthorized' });
                                                                                                                                                                                                }

                                                                                                                                                                                                        await post.remove();
                                                                                                                                                                                                                res.status(200).json({ message: 'Post removed' });
                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                            res.status(500).json({ error: error.message });
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                