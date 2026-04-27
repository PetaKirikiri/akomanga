import type { UnderlineCapStyle } from '@/lib/tokenStyling';
import { getTokenStyle, getUnderlineCapClass } from '@/lib/tokenStyling';

type TokenUnderlineProps = {
  underlineColor?: string | null;
  capStyle?: UnderlineCapStyle;
  children: React.ReactNode;
};

export function TokenUnderline({ underlineColor, capStyle = 'both', children }: TokenUnderlineProps) {
  const style = getTokenStyle(underlineColor);
  const capClass = getUnderlineCapClass(capStyle);
  return (
    <span className={capClass || undefined} style={style ?? undefined}>
      {children}
    </span>
  );
}
