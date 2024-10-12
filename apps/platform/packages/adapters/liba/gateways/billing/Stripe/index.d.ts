import { PlanName } from "@platform/core/domain/plan";
import { BillingGateway, BillingGatewayWebhookPayload, GetEventResult, InvoiceEventData } from "@platform/core/services/Billing/types";
import Stripe from "stripe";
export type PlanToStripeIdMap = {
    [key in PlanName]: string;
};
export declare class StripeBillingGateway implements BillingGateway {
    private stripe;
    private planToIdMap;
    constructor(planToIdMap: PlanToStripeIdMap);
    subscribeUser(customerId: string, planId: PlanName, webhookPayload: BillingGatewayWebhookPayload): Promise<void>;
    unsubscribeUser(customerId: string, planId: PlanName): Promise<void>;
    attachCustomerPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
    setCustomerDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
    generateCustomerId(params: {
        email: string;
        name?: string;
        paymentMethodId?: string;
    }): Promise<string>;
    getEventById(eventId: string, payload: any): Promise<GetEventResult>;
    formatInvoiceData(event: Stripe.Event): Promise<InvoiceEventData>;
    hasActiveSubscription(customerId: string): Promise<boolean>;
}
