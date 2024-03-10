import { format, parseISO } from "date-fns";
import Link from "next/link";

type CardProps = {
  url: string;
  title: string;
  date: string;
  description?: string;
  tags: string[];
  category: string;
};

const Card: React.FC<CardProps> = ({
  url,
  title,
  date,
  description,
  tags,
  category,
}) => {
  return (
    <>
      <article>
        <header>
          <div className="flex flex-row">
            <h3 className="basis-3/4 text-lg underline">
              <Link href={`${url}`}>{title}</Link>
            </h3>
            <p className="basis-1/4 text-xs text-right">
              {format(parseISO(date), "LLLL d, yyyy")}
            </p>
          </div>
        </header>
        <div className="flex flex-row">
          <p className="mr-2 my-0 p-0">
            <span className="font-medium">category</span> :{" "}
            <Link href={`/categories/${encodeURIComponent(category)}`}>
              {category}
            </Link>
          </p>
          <p className="mr-2 my-0 p-0 font-medium">tags : </p>
          <ul className="flex flex-row">
            {tags.map((tag) => (
              <li className="mr-2" key={tag}>
                <Link href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
              </li>
            ))}
          </ul>
        </div>
        {description && (
          <p>
            <span className="font-medium">description</span> : {description}
          </p>
        )}
      </article>
    </>
  );
};

export default Card;
