import clsx from 'clsx';
import pmrRuble from '../../../assets/ruble_symbol.svg';
import pmrRubleWhite from '../../../assets/ruble_symbol_white.svg';

interface PMRRubleIconProps extends React.HTMLAttributes<HTMLImageElement> {
  size?: number;
}
export function PMRRubleIcon({
  size = 16,
  className,
  ...rest
}: PMRRubleIconProps) {
  return (
    <>
      <img
        src={pmrRuble}
        alt="Pridnestrovian Ruble"
        className={clsx(className, 'inline dark:hidden')}
        width={size}
        height={size}
        {...rest}
      />
      <img
        src={pmrRubleWhite}
        alt="Pridnestrovian Ruble White"
        className={clsx(className, 'hidden dark:inline')}
        width={size}
        height={size}
        {...rest}
      />
    </>
  );
}
