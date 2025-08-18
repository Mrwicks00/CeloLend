import { NextRequest, NextResponse } from "next/server";

// TODO: Import Self Protocol backend verifier when we set it up
// import {
//   SelfBackendVerifier,
//   AllIds,
//   DefaultConfigStore,
//   VerificationConfig
// } from '@selfxyz/core';

export async function POST(request: NextRequest) {
  try {
    const { attestationId, proof, publicSignals, userContextData } =
      await request.json();

    // Verify all required fields are present
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      return NextResponse.json(
        {
          message:
            "Proof, publicSignals, attestationId and userContextData are required",
        },
        { status: 400 }
      );
    }

    // TODO: Set up Self Protocol backend verifier
    // For now, simulate verification success
    console.log("Received verification request:", {
      attestationId,
      userContextData,
      proofLength: proof ? Object.keys(proof).length : 0,
      publicSignalsLength: publicSignals ? publicSignals.length : 0,
    });

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Replace with actual verification
    // const verification_config = {
    //   excludedCountries: [],
    //   ofac: false,
    //   minimumAge: 18,
    // };
    //
    // const configStore = new DefaultConfigStore(verification_config);
    // const selfBackendVerifier = new SelfBackendVerifier(
    //   "celolend",
    //   "https://your-api-endpoint.com/api/verify",
    //   true, // true = mock for testing, false = production
    //   AllIds,
    //   configStore,
    //   "hex"
    // );
    //
    // const result = await selfBackendVerifier.verify(
    //   attestationId,
    //   proof,
    //   publicSignals,
    //   userContextData
    // );

    // For now, return success
    return NextResponse.json({
      status: "success",
      result: true,
      credentialSubject: {
        nationality: "US", // Mock data
        gender: "M", // Mock data
        minimumAge: 18,
        // Add other fields as needed
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        status: "error",
        result: false,
        message: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
