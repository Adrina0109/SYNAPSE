import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema(
    {
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
        },
        page: {
            type: Number,
        },
        chunkIndex: {
            type: Number,
        },
        embedding: {
            type: [Number],
            select: false,
        },
    },
    { timestamps: true }
);

const Chunk = mongoose.model('Chunk', chunkSchema);
export default Chunk;
