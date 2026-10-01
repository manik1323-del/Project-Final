const db = require('../config/db');

exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', stationId, slotId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }

    const orderId = 'order_' + Math.random().toString(36).substring(2, 14);
    const keyId = 'rzp_test_EV_CHARGING_KEY_2026';

    return res.json({
      success: true,
      order: {
        id: orderId,
        amount: Math.round(amount * 100), // in paise
        currency,
        key_id: keyId,
        stationId,
        slotId
      }
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate payment.' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;

    // Simulated signature check
    const isMockValid = !!(razorpay_payment_id || razorpay_order_id);

    if (!isMockValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment parameters.' });
    }

    return res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id || ('pay_' + Math.random().toString(36).substring(2, 12)),
      message: 'Payment verified successfully.'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
};
