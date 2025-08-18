import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

const CeloLendModule = buildModule("CeloLendModule", (m) => {
  // Environment variables with defaults
  const selfHubAddress = m.getParameter("selfHubAddress", "0x68c931C9a534D37aa78094877F46fE46a49F1A51");
  const selfScopeHash = m.getParameter("selfScopeHash", "293608c951e9ebb45305919fb9f347829c571e319c310a40b4b71da9ee79cbf1");
  const selfConfigId = m.getParameter("selfConfigId", "0x0000000000000000000000000000000000000000000000000000000000000000");

  // 1. Deploy PriceOracle first
  const priceOracle = m.contract("PriceOracle", []);

  // 2. Deploy MentoIntegration
  const mentoIntegration = m.contract("MentoIntegration", []);

  // 3. Deploy CollateralVault
  const collateralVault = m.contract("CollateralVault", []);

  // 4. Deploy CreditScore
  const creditScore = m.contract("CreditScore", []);

  // 5. Deploy main CeloLend contract
  const celoLend = m.contract("CeloLend", [
    selfHubAddress,        // _identityVerificationHubV2
    selfScopeHash,         // _scope
    selfConfigId,          // _configId
    collateralVault,       // _collateralVault
    creditScore,           // _creditScore
    priceOracle,           // _priceOracle
    mentoIntegration       // _mentoIntegration
  ]);

  // 6. Configure CreditScore to allow CeloLend to update scores
  m.call(creditScore, "setPlatform", [celoLend]);

  // 7. Configure CollateralVault to allow CeloLend to manage collateral
  m.call(collateralVault, "setPlatform", [celoLend]);

  return {
    celoLend,
    collateralVault,
    creditScore,
    priceOracle,
    mentoIntegration,
  };
});

export default CeloLendModule;
