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

    const priceMap = {
      "guided-ice": "price_1TqobQQ9xgSB9tszPa0d0UOB",
      "21-day-reset": "price_1TqobMQ9xgSB9tszAHuU9eQ6",
      "starter-kit": "price_1TqobLQ9xgSB9tszs3S5Zs8L",
      "thermometer": "price_1TqobLQ9xgSB9tszZuLdK1Hh",
      "breath-trainer": "price_1TqobLQ9xgSB9tszjbeQddEt",
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
      success_url: `${process.env.URL}/payment-success`,
      cancel_url: `${process.env.URL}/payment-canceled`,
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
