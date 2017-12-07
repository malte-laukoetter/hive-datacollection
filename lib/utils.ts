export const currentISODateString = () => {
  return toISODateString(new Date());
}
export const toISODateString = (date: Date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().substr(0, 10);
}