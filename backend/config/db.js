


import mongoose from "mongoose"

// const URI = "mongodb://127.0.0.1:27017/drovo"
// "mongodb+srv://yatharth:yatharth@cluster0.queta.mongodb.net/drovo?retryWrites=true&w=majority&appName=Cluster0"
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.URI).then(() => console.log("DB Connected"))
    } catch (error) {
        console.log("Error ", error.message);
    }
}


