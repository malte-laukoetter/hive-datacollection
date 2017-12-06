export const currentISODateString = () => {
  const tempDate = new Date();

  return new Date(Date.UTC(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate())).toISOString().substr(0, 10);
}