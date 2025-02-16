//=============================================================================
// Configuration
//=============================================================================

// The DOM element that the Google Pay button will be rendered into
const GPAY_BUTTON_CONTAINER_ID = "gpay-container";

// Update the `merchantId` and `merchantName` properties with your own values.
// Your real info is required when the environment is `PRODUCTION`.
const merchantInfo = {
	merchantId: "12345678901234567890",
	merchantName: "Example Merchant",
};

// This is the base configuration for all Google Pay payment data requests.
const baseGooglePayRequest = {
	apiVersion: 2,
	apiVersionMinor: 0,
	allowedPaymentMethods: [
		{
			type: "CARD",
			parameters: {
				allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
				allowedCardNetworks: ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"],
			},
			tokenizationSpecification: {
				type: "PAYMENT_GATEWAY",
				parameters: {
					gateway: "example",
					gatewayMerchantId: "exampleGatewayMerchantId",
				},
			},
		},
	],
	merchantInfo,
};

// Prevent accidental edits to the base configuration. Mutations will be
// handled by cloning the config using deepCopy() and modifying the copy.
Object.freeze(baseGooglePayRequest);

//=============================================================================
// Google Payments client singleton
//=============================================================================

let paymentsClient = null;

function getGooglePaymentsClient() {
	if (paymentsClient === null) {
		paymentsClient = new google.payments.api.PaymentsClient({
			environment: "TEST",
			merchantInfo,
			// todo: paymentDataCallbacks (codelab pay-web-201)
			paymentDataCallbacks: {
				onPaymentAuthorized: onPaymentAuthorized,
				onPaymentDataChanged: onPaymentDataChanged,
			},
		});
	}

	return paymentsClient;
}

//=============================================================================
// Helpers
//=============================================================================

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

function renderGooglePayButton() {
	const button = getGooglePaymentsClient().createButton({
		buttonColor: "default",
		buttonType: "buy",
		buttonRadius: 8,
		buttonLocale: "en",
		onClick: onGooglePaymentButtonClicked,
		allowedPaymentMethods: baseGooglePayRequest.allowedPaymentMethods,
	});

	document.getElementById(GPAY_BUTTON_CONTAINER_ID).appendChild(button);
}

//=============================================================================
// Event Handlers
//=============================================================================

function onGooglePayLoaded() {
	const req = deepCopy(baseGooglePayRequest);

	getGooglePaymentsClient()
		.isReadyToPay(req)
		.then(function (res) {
			if (res.result) {
				renderGooglePayButton();
			} else {
				console.log("Google Pay is not ready for this user.");
			}
		})
		.catch(console.error);
}

function onGooglePaymentButtonClicked() {
	// Create a new request data object for this request
	const req = {
		...deepCopy(baseGooglePayRequest),
		transactionInfo: {
			countryCode: "US",
			currencyCode: "USD",
			totalPriceStatus: "FINAL",
			totalPrice: (Math.random() * 999 + 1).toFixed(2),
		},
		// todo: callbackIntents (codelab gpay-web-201)
		callbackIntents: ["PAYMENT_AUTHORIZATION", "SHIPPING_ADDRESS", "SHIPPING_OPTION", "OFFER"],
		shippingAddressRequired: true,
		shippingOptionRequired: true,
		shippingOptionParameters: {
			defaultSelectedOptionId: "shipping-001",
			shippingOptions: [
				{
					id: "shipping-001",
					label: "$0.00: Free shipping",
					description: "Free Shipping delivered in 5 business days.",
				},
				{
					id: "shipping-002",
					label: "$1.99: Standard shipping",
					description: "Standard shipping delivered in 3 business days.",
				},
				{
					id: "shipping-003",
					label: "$1000: Express shipping",
					description: "Express shipping delivered in 1 business day.",
				},
			],
		},
	};

	// Write request object to console for debugging
	console.log(req);

	getGooglePaymentsClient()
		.loadPaymentData(req)
		.then(function (res) {
			// Write response object to console for debugging
			console.log(res);
			// @todo pass payment token to your gateway to process payment
			// @note DO NOT save the payment credentials for future transactions
			paymentToken = res.paymentMethodData.tokenizationData.token;
		})
		.catch(console.error);
}

function onPaymentAuthorized(paymentData) {
	return new Promise(function (resolve, reject) {
		// Write the data to console for debugging
		console.log("onPaymentAuthorized", paymentData);

		// Do something here to pass token to your gateway

		// To simulate the payment processing, there is a 70% chance of success
		const paymentAuthorizationResult =
			Math.random() > 0.3
				? { transactionState: "SUCCESS" }
				: {
						transactionState: "ERROR",
						error: {
							intent: "PAYMENT_AUTHORIZATION",
							message: "Insufficient funds",
							reason: "PAYMENT_DATA_INVALID",
						},
				  };

		resolve(paymentAuthorizationResult);
	});
}

function onPaymentDataChanged(intermediatePaymentData) {
	return new Promise(function (resolve, reject) {
		let paymentDataRequestUpdate = {};

		// Write the data to console for debugging
		console.log("onPaymentDataChanged", intermediatePaymentData);

		switch (intermediatePaymentData.callbackTrigger) {
			case "INITIALIZE":
				// Handle initialize
				break;
			case "SHIPPING_ADDRESS":
				// Read intermediatePaymentData.transactionInfo
				// Read intermediatePaymentData.shippingAddress
				// Update paymentDataRequestUpdate.newTransactionInfo
				break;
			case "SHIPPING_OPTION":
				// Read intermediatePaymentData.transactionInfo
				// Read intermediatePaymentData.shippingOptionData
				// Update paymentDataRequestUpdate.newTransactionInfo
				// Update paymentDataRequestUpdate.newShippingOptionParameters
				break;
			case "OFFER":
				// Read intermediatePaymentData.offerData
				// Read intermediatePaymentData.transactionInfo
				// Update paymentDataRequestUpdate.newTransactionInfo
				// Update paymentDataRequestUpdate.newOfferInfo
				break;
			default:
			// Update paymentDataRequestUpdate.error
		}

		resolve(paymentDataRequestUpdate);
	});
}
