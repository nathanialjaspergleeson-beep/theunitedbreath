import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: "easeOut" as const,
    },
  }),
};

const Checkout = () => {
  const { items, subtotal } = useCart();
  const hasPhysical = items.some((i) => i.product.type === "physical");
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "No checkout URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <main className="flex-1 pt-32 pb-20 px-6 text-center">
          <p className="font-body text-muted-foreground mb-6">
            Your cart is empty.
          </p>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-primary font-body text-sm uppercase tracking-widest hover:text-secondary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Shop
          </Link>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />

      <main className="flex-1 relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-background to-background pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">

          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-muted-foreground font-body text-sm uppercase tracking-widest hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold text-foreground mb-12"
          >
            <span className="text-primary italic">
              Checkout
            </span>
          </motion.h1>


          <div className="grid lg:grid-cols-5 gap-12">

            {/* Payment */}
            <motion.div
              initial="hidden"
              animate="visible"
              className="lg:col-span-3 space-y-8"
            >

              <motion.div
                variants={fadeUp}
                custom={0}
                className="p-8 rounded-3xl bg-gradient-to-br from-card to-muted/20 border border-primary/20 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-xl text-foreground">
                    Secure Payment
                  </h2>
                </div>

                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  You'll be redirected to Stripe's secure checkout to complete your payment. Your card details are handled entirely by Stripe.
                </p>

                <div className="flex items-center gap-2 text-muted-foreground/60">
                  <Lock className="w-4 h-4" />
                  <span className="font-body text-xs">
                    256-bit SSL encryption
                  </span>
                </div>
              </motion.div>


              <motion.button
                variants={fadeUp}
                custom={1}
                onClick={handleCheckout}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-body font-medium text-sm uppercase tracking-widest rounded-full hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Redirecting..."
                  : `Pay with Stripe — $${subtotal.toFixed(2)}`}
              </motion.button>

            </motion.div>


            {/* Summary */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="lg:col-span-2"
            >

              <div className="p-8 rounded-3xl bg-gradient-to-br from-card to-muted/10 border border-border/30 lg:sticky lg:top-28">

                <h2 className="font-display text-xl text-foreground mb-6">
                  Order Summary
                </h2>


                <div className="space-y-4 mb-6">

                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between items-start gap-4"
                    >

                      <div className="min-w-0">
                        <p className="font-body text-sm text-foreground truncate">
                          {item.product.name}
                        </p>

                        <p className="font-body text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>


                      <span className="font-body text-sm text-foreground font-medium">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>

                    </div>
                  ))}

                </div>


                <div className="border-t border-border/30 pt-4">

                  <div className="flex justify-between">
                    <span className="font-body text-muted-foreground">
                      Subtotal
                    </span>

                    <span className="font-display text-lg font-bold text-foreground">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>


                  {hasPhysical && (
                    <p className="font-body text-xs text-muted-foreground mt-2">
                      + Shipping (calculated at checkout)
                    </p>
                  )}

                </div>

              </div>

            </motion.div>

          </div>

        </div>
      </main>


      <Footer />

    </div>
  );
};

export default Checkout;
