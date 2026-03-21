import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BlindBidModule", (m) => {
  const commitDurationInSeconds = m.getParameter("commitDurationInSeconds", 60n);
  const revealDurationInSeconds = m.getParameter("revealDurationInSeconds", 60n);
  const defaultBeneficiary = m.getAccount(0);
  const beneficiary = m.getParameter("beneficiary", defaultBeneficiary);

  const blindBid = m.contract("BlindBid", [
    commitDurationInSeconds,
    revealDurationInSeconds,
    beneficiary,
  ]);

  return { blindBid };
});
