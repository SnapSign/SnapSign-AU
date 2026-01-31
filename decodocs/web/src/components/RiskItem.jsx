import React from 'react';

/**
 * Risk item component for displaying individual risks
 */
const RiskItem = ({ risk }) => {
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-600';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBorderColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'border-l-red-600';
      case 'medium':
        return 'border-l-orange-500';
      case 'low':
        return 'border-l-yellow-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`mb-3 border border-gray-300 rounded overflow-hidden ${getBorderColor(risk.riskLevel)}`}>
      <div className="flex justify-between items-center p-2.5 bg-gray-50">
        <h6 className="m-0 text-gray-700 font-semibold">{risk.clause}</h6>
        <span
          className={`px-2 py-0.5 rounded-xl text-xs font-bold text-white ${getRiskColor(risk.riskLevel)}`}
        >
          {risk.riskLevel.toUpperCase()}
        </span>
      </div>
      <div className="p-2.5 bg-white">
        <p className="mb-2">
          <strong>Risk:</strong> {risk.description}
        </p>
        <p className="m-0">
          <strong>Plain Language:</strong> {risk.explanation}
        </p>
      </div>
    </div>
  );
};

export default RiskItem;
