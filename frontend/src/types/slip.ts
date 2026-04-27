export interface SlipVerificationResult {
  success: boolean;
  message?: string;
  data?: {
    transRef: string;
    sendingBank: string;
    receivingBank: string;
    transDate: string;
    transTime: string;
    sender: {
      displayName: string;
      name: string;
    };
    receiver: {
      displayName: string;
      name: string;
    };
    amount: number;
    paidLocalAmount: number;
    paidLocalCurrency: string;
    countryCode: string;
  };
}

export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
}
