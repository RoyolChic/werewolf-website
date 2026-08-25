export function SceneBackdrop({ imagePath }: { imagePath: string }) {
  return (
    <div
      className="scene-backdrop"
      style={{
        backgroundImage: `linear-gradient(oklch(10% 0.02 50 / 0.55), oklch(10% 0.02 50 / 0.75)), url(${imagePath})`,
      }}
    />
  );
}
