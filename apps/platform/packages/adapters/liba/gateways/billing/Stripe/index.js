"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeBillingGateway = void 0;
const types_1 = require("@platform/core/services/Billing/types");
const getStripe_1 = __importStar(require("@platform/shared/src/getStripe"));
class StripeBillingGateway {
    constructor(planToIdMap) {
        this.planToIdMap = planToIdMap;
        this.stripe = (0, getStripe_1.default)();
    }
    async subscribeUser(customerId, planId, webhookPayload) {
        const priceId = this.planToIdMap[planId];
        const customer = (await this.stripe.customers.retrieve(customerId));
        // Create the subscription with a trial period
        await this.stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            expand: ["latest_invoice.payment_intent"],
            metadata: webhookPayload,
        });
        // const invoice = subscription.latest_invoice as Stripe.Invoice;
        // const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        // TODO - Check what with the intent and invoice
        // if there is a trial period, the paymentIntent's status will be requires_payment_method
    }
    async unsubscribeUser(customerId, planId) {
        const priceId = this.planToIdMap[planId];
        if (!priceId)
            throw new Error(`Invalid plan id '${planId}'`);
        const customer = (await this.stripe.customers.retrieve(customerId));
        const subscriptions = await this.stripe.subscriptions.list({
            customer: customer.id,
        });
        const subscription = subscriptions.data.find((sub) => sub.items.data[0].price.id === priceId);
        if (!subscription) {
            return;
        }
        await this.stripe.subscriptions.cancel(subscription.id);
    }
    async attachCustomerPaymentMethod(customerId, paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
    }
    //   public async detachCustomerPaymentMethod(
    //     customerId: string,
    //     paymentMethodId: string
    //   ): Promise<void> {
    //     await this.stripe.paymentMethods.detach(paymentMethodId, {
    //       ""
    //     });
    //   }
    async setCustomerDefaultPaymentMethod(customerId, paymentMethodId) {
        await this.stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });
    }
    async generateCustomerId(params) {
        const { email, name, paymentMethodId } = params;
        const newCustomer = await this.stripe.customers.create({
            payment_method: paymentMethodId,
            invoice_settings: { default_payment_method: paymentMethodId },
            email,
            name,
        });
        return newCustomer.id;
    }
    async getEventById(eventId, payload) {
        const webHookSecret = await (0, getStripe_1.getWebhookSecret)();
        const event = this.stripe.webhooks.constructEvent(payload, eventId, webHookSecret);
        let coreType = "other";
        if (types_1.coreTypes.includes(event.type))
            coreType = event.type;
        return {
            coreType: coreType,
            originalType: event.type,
            originalEvent: event,
        };
    }
    async formatInvoiceData(event) {
        if (event.type !== "invoice.payment_succeeded" &&
            event.type !== "invoice.payment_failed") {
            throw new Error("Invalid event type");
        }
        const invoice = event.data.object;
        // subscription metadata
        const subscriptionMetadata = invoice.subscription_details
            ?.metadata;
        const data = {
            amount: invoice.amount_due,
            currency: invoice.currency,
            eventId: event.id,
            paymentStatus: event.type !== "invoice.payment_succeeded" ? "success" : "failed",
            subscriptionId: invoice.subscription,
            userId: subscriptionMetadata.userId,
            planId: subscriptionMetadata.planId,
            planVersion: parseInt(subscriptionMetadata.planVersion),
            date: new Date(invoice.created * 1000),
        };
        return data;
    }
    async hasActiveSubscription(customerId) {
        try {
            const subscriptions = await this.stripe.subscriptions.list({
                customer: customerId,
                status: "active",
            });
            return subscriptions.data.length > 0;
        }
        catch (error) {
            console.error(`Error checking active plan for customer ${customerId}:`, error);
            return false;
        }
    }
}
exports.StripeBillingGateway = StripeBillingGateway;
//# sourceMappingURL=index.js.map