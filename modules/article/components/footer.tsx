import Link from "next/link";

type FooterProps = {
  next?: number|null;
  prev?: number|null;
};

const Footer: React.FC<FooterProps> = ({
  next,
  prev
}) => {
  return (
    <>
      <div className="flex flex-row content-center justify-center">
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          {prev && <Link href={`/?page=${prev}`}>previous</Link>}
        </div>
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          <Link href="/">◆</Link>
        </div>
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          {next && <Link href={`/?page=${next}`}>next</Link>}
        </div>
      </div>
    </>
  );
};

export default Footer;
