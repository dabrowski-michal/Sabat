Place paper doll image assets in this directory.

Required files:
  base_male.png   — full-body silhouette for male characters (300x500 px recommended)
  base_female.png — full-body silhouette for female characters (300x500 px recommended)

Optional layer images (must be the same dimensions as the base):
  weapon_<name>.png  — weapon overlay (z-index 10, behind body)
  legs_<name>.png    — leg armor overlay (z-index 30)
  boots_<name>.png   — boot overlay (z-index 40)
  chest_<name>.png   — chest armor overlay (z-index 50)
  head_<name>.png    — helmet overlay (z-index 60)
  hands_<name>.png   — gloves overlay (z-index 70)

The base body is rendered at z-index 20, so weapons appear held in front
of a background but the body silhouette overlaps them.

Each weapon or armor item can be assigned a Paper Doll Layer in its item
sheet. When that item is equipped, its image will be shown on this doll.
