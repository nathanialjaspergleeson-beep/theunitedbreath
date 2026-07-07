const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { items } = JSON.parse(event.body);

    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No items provided" }),
      };
    }

    // Replace this with your real Stripe price IDs
    const priceMap = {
      // Example:
      // "product-id-from-your-site": "price_xxxxxxxxx"
    };

    const line_items = items.map((item) => {
      const priceId = priceMap[item.productId];

      if (!priceId) {
        throw new Error(`No Stripe price ID found for ${item.productId}`);
      }

      return {
        price: priceId,
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.URL}/success`,
      cancel_url: `${process.env.URL}/cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
