const Forum = require('../models/Forum');

const createPost = async (postData) => {
    const newPost = new Forum(postData);
    await newPost.save();
    return newPost;
};

const getPosts = async () => {
    return await Forum.find({});
};

const getPostById = async (postId) => {
    return await Forum.findById(postId);
};

const updatePost = async (postId, postData) => {
    const updatedPost = await Forum.findByIdAndUpdate(postId, postData, { new: true });
    return updatedPost;
};

const deletePost = async (postId) => {
    await Forum.findByIdAndDelete(postId);
    return { message: 'Post deleted successfully' };
};

module.exports = {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
};
