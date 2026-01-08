const { default: mongoose } = require("mongoose");

const cartController = {}

const removeItem = async (req, res) => {
    try {
        const Cart = mongoose.model('Cart')
        const { productId, userId } = req.body;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
        await cart.save();

        res.json(cart);
    } catch (error) {
        console.error("error while remove item", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }

}

const getCartItems = async (req, res) => {
    const Cart = mongoose.model('Cart');
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: "Id is required" });
    }

    try {
        const cart = await Cart.findOne({ user: id, placed: false, isDeleted: false })
            .populate({
                path: 'items.productId',
                select: '_id type title duration price image category',
                populate: [
                    { path: 'image', select: '_id url' },
                    { path: 'category', select: '_id name' }
                ]
            });

        if (!cart) {
            return res.status(404).json({ success: false, message: "No items found in cart" });
        }

        // Map items to only include product data
        const simplifiedItems = cart.items.map(item => ({
            _id: item.productId._id,
            type: item.productId.type,
            title: item.productId.title,
            duration: item.productId.duration,
            price: item.productId.price,
            image: item.productId.image,       // populated image
            category: item.productId.category  // populated category
        }));

        res.status(200).json({ success: true, cart: simplifiedItems });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


const addItems = async (req, res) => {
    const Cart = mongoose.model('Cart')
    const { productId, userId } = req.body;

    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, placed: false, items: [{ productId, quantity: 1 }] });
        } else {
            const exists = cart.items.some(item => item.productId.toString() === productId);
            if (exists) {
                return res.status(400).json({ message: 'Course is already in cart' });
            }

            cart.items.push({ productId, quantity: 1 });
        }

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

const clearCart = async (req, res) => {
    try {
        const Cart = mongoose.model('Cart')
        const { userId } = req.body;
        await Cart.findOneAndUpdate({ user: userId }, {
            $set: {
                isDeleted: true
            }
        })
    } catch (error) {
        console.error("error while clear the cart", error);
        res.status(500).json({ success: false, message: "Server Error" });

    }
}

const getUserCartCount =async (req,res) => {
    try {
        const Cart = mongoose.model('Cart')
        const { id } = req.query;
        const cart = await Cart.findOne({ user: new mongoose.Types.ObjectId(id), placed: false, isDeleted: false });
        const count = cart ? cart.items.length : 0;
        res.json({ success: true, count });
    } catch (error) {
        console.error("error while getting user cart count", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

cartController.clearCart = clearCart
cartController.addItems = addItems
cartController.removeItem = removeItem
cartController.getCartItems = getCartItems
cartController.getUserCartCount = getUserCartCount
module.exports = cartController