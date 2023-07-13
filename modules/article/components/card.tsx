import { format, parseISO } from 'date-fns';
import Link from "next/link";

type CardProps = {
  url: string;
  title: string;
  date: string;
  description?: string;
};

const Card: React.FC<CardProps> = ({
  url,
  title,
  date,
  description,
}) => {
  return (
    <>
      <article className="shadow-xl">
        <header>
          <h3 className="text-lg underline">
            <Link href={`${url}`}>{title}</Link>
          </h3>
        </header>
        <p className="text-xs text-right">{format(parseISO(date), 'LLLL d, yyyy')}</p>
        {description && <p className="">{description}</p>}
      </article>
    </>
  );
};

export default Card;
