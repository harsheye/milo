export function calculateRefill({ amount, pricePerLiter, currentOdometer, previousOdometer }) {
  const paid = Number(amount);
  const rate = Number(pricePerLiter);
  const current = Number(currentOdometer);
  const previous = Number(previousOdometer);
  const liters = rate > 0 ? paid / rate : 0;
  const distance = Math.max(0, current - previous);
  return {
    liters,
    distance,
    mileage: liters > 0 ? distance / liters : 0,
  };
}
