import React from "react";
import { EmployeeOnboardProvider } from "../../context/EmployeeOnboardContext";
import { EmployeeOnboardWizard } from "../../components/modules/EmployeeOnboard";

const TeamOnboard: React.FC = () => {
  return (
    <EmployeeOnboardProvider>
      <EmployeeOnboardWizard />
    </EmployeeOnboardProvider>
  );
};

export default TeamOnboard;
