export default function BrandMark({ brand, className = '' }) {
  if(!brand.name && !brand.logo)return <span className="asset-empty-label">No logo yet</span>;
  return brand.logo ? <img className={`brand-logo ${className}`} src={brand.logo} alt={`Logo ${brand.name}`} /> : <span className={`brand-word ${className}`}>{brand.name}</span>;
}
