const { default: mongoose } = require("mongoose");

const cartController = {}

const removeItem = async (req, res) => {
    const Cart = mongoose.model('Cart')
    const { productId } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(i => i.productId.toString() !== productId);
    await cart.save();

    res.json(cart);
}

const getCartItems = async (req, res) => {
    const Cart = mongoose.model('Cart')
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).populate('items.productId');

    res.json(cart);
}

const addItems = async (req, res) => {
    const Cart = mongoose.model('Cart')
    const { productId, userId } = req.body;

    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [{ productId, quantity: 1 }] });
        } else {
            const exists = cart.items.some(item => item.productId.toString() === productId);
            if (exists) {
                return res.status(400).json({ message: 'Course is already in cart' });
            }

            cart.items.push({ productId, quantity: 1 });
        }

        await cart.save();
        res.json({success: true , cart});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
cartController.addItems = addItems
cartController.removeItem = removeItem
cartController.getCartItems = getCartItems
module.exports = cartController