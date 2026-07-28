import { DEFAULT_SIZE, type IconProps } from './icon-base'

/* Solid glyphs: they carry no stroke, so `color` alone drives their appearance. */
function SolidIcon({
  size = DEFAULT_SIZE,
  children
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      {children}
    </svg>
  )
}

export function GitHubIcon({ size = DEFAULT_SIZE }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

export function TapeIcon({ size = DEFAULT_SIZE }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2.5" y="8.5" width="19" height="7" rx="2.5" transform="rotate(-8 12 12)" />
    </svg>
  )
}

export function BoltIcon(props: IconProps): React.JSX.Element {
  return (
    <SolidIcon {...props}>
      <path d="M17.9105 10.7209H14.8205V3.52087C14.8205 1.84087 13.9105 1.50087 12.8005 2.76087L12.0005 3.67087L5.2305 11.3709C4.3005 12.4209 4.6905 13.2809 6.0905 13.2809H9.1805V20.4809C9.1805 22.1609 10.0905 22.5009 11.2005 21.2409L12.0005 20.3309L18.7705 12.6309C19.7005 11.5809 19.3105 10.7209 17.9105 10.7209Z" />
    </SolidIcon>
  )
}

export function SendIcon(props: IconProps): React.JSX.Element {
  return (
    <SolidIcon {...props}>
      <path d="M16.1391 2.95907L7.10914 5.95907C1.03914 7.98907 1.03914 11.2991 7.10914 13.3191L9.78914 14.2091L10.6791 16.8891C12.6991 22.9591 16.0191 22.9591 18.0391 16.8891L21.0491 7.86907C22.3891 3.81907 20.1891 1.60907 16.1391 2.95907ZM16.4591 8.33907L12.6591 12.1591C12.5091 12.3091 12.3191 12.3791 12.1291 12.3791C11.9391 12.3791 11.7491 12.3091 11.5991 12.1591C11.3091 11.8691 11.3091 11.3891 11.5991 11.0991L15.3991 7.27907C15.6891 6.98907 16.1691 6.98907 16.4591 7.27907C16.7491 7.56907 16.7491 8.04907 16.4591 8.33907Z" />
    </SolidIcon>
  )
}
