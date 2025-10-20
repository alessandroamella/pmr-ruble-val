import pmrRuble from '../../../assets/ruble_symbol.svg';

interface PMRRubleIconProps extends React.HTMLAttributes<HTMLImageElement> {
  size?: number;
}
export function PMRRubleIcon({ size = 18, ...rest }: PMRRubleIconProps) {
  return (
    <img src={pmrRuble} alt="PMR Ruble" width={size} height={size} {...rest} />
  );
}
