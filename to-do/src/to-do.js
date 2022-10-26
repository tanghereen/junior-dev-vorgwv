/* eslint-disable jsx-a11y/anchor-is-valid */
// eslint-disable-next-line no-undef
const {useState, useEffect} = React;
const data = [
  {
	"userId": 1,
	"id": 1,
	"title": "delectus aut autem",
	"completed": false
  },
  {
	"userId": 1,
	"id": 2,
	"title": "quis ut nam facilis et officia qui",
	"completed": false
  },
  {
	"userId": 1,
	"id": 3,
	"title": "fugiat veniam minus",
	"completed": false
  },
  {
	"userId": 1,
	"id": 4,
	"title": "et porro tempora",
	"completed": true
  },
  {
	"userId": 1,
	"id": 5,
	"title": "laboriosam mollitia et enim quasi adipisci quia provident illum",
	"completed": false
  },
  {
	"userId": 1,
	"id": 6,
	"title": "qui ullam ratione quibusdam voluptatem quia omnis",
	"completed": false
  },
  {
	"userId": 1,
	"id": 7,
	"title": "illo expedita consequatur quia in",
	"completed": false
  },
  {
	"userId": 1,
	"id": 8,
	"title": "quo adipisci enim quam ut ab",
	"completed": true
  },
  {
	"userId": 1,
	"id": 9,
	"title": "molestiae perspiciatis ipsa",
	"completed": false
  },
  {
	"userId": 1,
	"id": 10,
	"title": "illo est ratione doloremque quia maiores aut",
	"completed": true
  },
  {
	"userId": 1,
	"id": 11,
	"title": "vero rerum temporibus dolor",
	"completed": true
  },
  {
	"userId": 1,
	"id": 12,
	"title": "ipsa repellendus fugit nisi",
	"completed": true
  },
  {
	"userId": 1,
	"id": 13,
	"title": "et doloremque nulla",
	"completed": false
  },
  {
	"userId": 1,
	"id": 14,
	"title": "repellendus sunt dolores architecto voluptatum",
	"completed": true
  },
  {
	"userId": 1,
	"id": 15,
	"title": "ab voluptatum amet voluptas",
	"completed": true
  },
  {
	"userId": 1,
	"id": 16,
	"title": "accusamus eos facilis sint et aut voluptatem",
	"completed": true
  },
  {
	"userId": 1,
	"id": 17,
	"title": "quo laboriosam deleniti aut qui",
	"completed": true
  },
  {
	"userId": 1,
	"id": 18,
	"title": "dolorum est consequatur ea mollitia in culpa",
	"completed": false
  },
  {
	"userId": 1,
	"id": 19,
	"title": "molestiae ipsa aut voluptatibus pariatur dolor nihil",
	"completed": true
  },
  {
	"userId": 1,
	"id": 20,
	"title": "ullam nobis libero sapiente ad optio sint",
	"completed": true
  },
];

const App = () => {
	const [ title ] = useState('To-do List created by Lucy');
	const [ pageNo, setPageNo ] = useState(0);
	const [ totalRows, selstTotalRows ] = useState(8);
	const [ totalPages, setTotalPages ] = useState(1);
	const [ dataAll, setDataAll ] = useState([]);
	const [ dataTable, setDataTable ] = useState([]);

	useEffect(()=>{
		setDataAll([...data]);
		setTotalPages(Math.floor(data.length/totalRows)+1);
	},[]);
	
	useEffect(()=>{
		const offset = pageNo*totalRows;
		setDataTable(dataAll.slice(offset,offset+totalRows));
	},[dataAll, pageNo]);  
	
	const onPageClick = (i) => {
		setPageNo(i);
	}
	
	const onPreviousClick = () => {
		setPageNo(pageNo>0? pageNo-1: pageNo)
	}
	
	const onNextClick = () => {
		setPageNo(pageNo<totalPages-1? pageNo+1: pageNo)
	}	

	return (
		<div className="container">
			<div className="container">
				<h1>To do list</h1>
				<table className="table">
				  <thead>
					<tr>
					  <th scope="col">#</th>
					  <th scope="col">Task</th>
					  <th scope="col">Completed?</th>
					</tr>
				  </thead>
				  <tbody>
				  {dataTable.map((td,i) => (
					<tr key={i} className={td.completed? 'text-gray': null}>
					  <th scope="row">{td.id}</th>
					  <td>{td.title}</td>
					  <td>{td.completed? 'Done' : 'To do' }</td>
					</tr>					
				  ))}
				  </tbody>
				</table>
			</div>
			
			<nav aria-label="Page navigation" className="container">
			  <ul className="pagination float-right">
				<li className="page-item">
    <a className="page-link" onClick={onPreviousClick}>Previous</a></li>
				{[...Array(totalPages).keys()].map((pages,i) => (
					// eslint-disable-next-line react/jsx-no-comment-textnodes
					<li className="page-item" key={i}>
            // eslint-disable-next-line jsx-a11y/anchor-is-valid
            <a className={pageNo===i ? 'page-linkactive':'page-link'} onClick={onPageClick.bind(null,i)}>{i+1}
                        </a>
                        </li>
				))}
				<li className="page-item"><a className="page-link" onClick={onNextClick}>Next</a></li>
			  </ul>
			</nav>   
		</div>
	);  
}


// eslint-disable-next-line no-undef
ReactDOM.render (<App />, document.getElementById("app"));
